# LAUNCH-RUNBOOK — Kytelink v2 seed & cutover

**Owner of every step below: the founder, executing alone.** Agents built and
proved all of this against a synthetic legacy **fixture** DB with zero real
credentials (see "Proof this works", bottom). Nothing in this repo has ever
touched — and must never touch — real production data. You run the real seed
yourself, with a **read-only** connection to the old prod database.

Companion specs (in git history since the repo flip — read with
`git show faa5f4d^:rewrite/<file>`): `18-migration.md` (authoritative),
`01-parity.md`, `08-media.md`, `10-moderation.md`. Plus
[`SELF-HOSTING.md`](./SELF-HOSTING.md) (env var reference + capability matrix).

---

## 0. Mental model (read first)

This is a **SEED, not a live migration.** The two stacks never run side by side
and nothing stays in sync. On launch day the old site goes down (~15 minutes of
full downtime is accepted), the fresh prod DB is seeded from the old one, and the
new stack comes up already populated. There is **no** maintenance mode, dual-write,
or coexistence machinery.

Signups have been disabled since **May 2025**, so the user set is frozen. Only
existing-user edits drift between the warm-up seed and launch — that drift is
exactly what **delta mode** re-copies at cutover.

**Cannot-lose scope:** users + auth account links (Google AND GitHub) + drafts +
published profiles (`banned` → `moderationStatus: BANNED`) + custom domains +
every referenced image. **Deliberately dropped** (excluded from all checksums):
the legacy `vcf` JSON (dead since 2023, no UI) and **all legacy analytics**
(`HitPage`/`HitLink` are ignored; ClickHouse starts empty; counts begin fresh).
Sessions may drop (re-login is fine).

The seed **builds the entire org layer** the old schema never had (a personal
Organization + `OWNER` membership per user), maps draft/prod content into
`Kyte`/`PublishedKyte` (**`Kyte.id` = old userId**, preserved), and **downloads
every legacy image** from whatever host it lives on (imagedelivery.net,
*.supabase.co, cloudfront, i.ibb.co) → normalizes via the shared sharp pipeline
→ re-uploads to the new bucket under `u/{kyteId}/…`.

---

## 1. Timeline

```
BEFORE launch day (no user impact):          LAUNCH DAY (~15 min full downtime):
A1  new stack deployed dark on staging        B1  take the old site down (static notice)
A2  preflight, then warm-up seed (read-only)   B2  snapshot the old prod DB
    into fresh prod DB — assets take HOURS      B3  delta seed (only rows changed since A2)
A3  moderation seed-sweep (spam dark)          B4  delta moderation sweep
A4  verify → 100% PASS                          B5  verify → MUST print 100% PASS  ← GATE
A5  visual-diff gallery, human-eyeballed        B6  point DNS at the new stack
                                                B7  scripted smoke test on prod URLs
                                                B8  signups ENABLED 🎉
```

All backfill scripts are standalone `tsx`, **idempotent**, **resumable** (a
checkpoint dir survives crashes), **dry-run by default / `--execute` to write**,
and read the old DB through a **session-level read-only connection** — a probe
`INSERT` is issued at start inside a rolled-back transaction, and the run aborts
if it is NOT rejected.

---

## 2. Pre-launch external setup (founder-only, days ahead)

Do these well before launch day; DNS/DNS-email propagation takes time.

- [ ] **OAuth apps** — ADD the new redirect URIs
  `https://api.kytelink.com/auth/callback/google` and `…/github` to the EXISTING
  Google + GitHub OAuth apps. **Add, don't replace** — the old site keeps working
  until the flip.
- [ ] **Email** — verify `mail.kytelink.com` in Resend (SPF/DKIM/DMARC).
- [ ] **CDN / bucket** — create the R2 bucket, point `cdn.kytelink.com` at it, add
  the Cloudflare rule **blocking `/q/*`** (the quarantine prefix — the `08-media.md` spec),
  run the owned-assets sync once (`pnpm --filter @kytelink/cdn sync`).
- [ ] **Custom domains — register every legacy domain on the NEW Vercel project.**
  The seed imports them as `verified: true` (they were live on v1), but the new
  project has never heard of them, so Vercel will not serve them until they are
  added. The domain reaper releases anything still disconnected **48 hours** after
  the seed, so this must happen inside that window — ideally during warm-up:
  ```bash
  # for each host in the legacy Domains table
  curl -X POST "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/domains?teamId=$VERCEL_TEAM" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"$HOST\"}"
  ```
  Then confirm: `pnpm --filter @kytelink/api exec tsx -e "import {runDomainReaper} from './src/workers/domain-reaper'; runDomainReaper().then(console.log)"`
  should report `reaped: 0` and `confirmed` equal to your domain count. A high
  `inconclusive` means the Vercel credentials are wrong — fix them before the
  window closes; the sweep will not delete anything while it cannot tell.
- [ ] **Provisioning** — Neon prod DB, ClickHouse Cloud, Render (api server +
  worker + Redis), the three Vercel projects with their domains
  (`kytelink.com`, `admin.kytelink.com`; `www` stays a Vercel-level redirect to apex).
- [ ] **DNS TTL** — lower the TTL on the `kytelink.com` records to ~60s several
  days in advance. The ~15-minute window assumes fast propagation.
- [ ] **Old DB connection string** — put it in `.env.PROD` as `LEGACY_DATABASE_URL`.
  A dedicated `SELECT`-only role is optional (pass it as `LEGACY_READONLY_URL` if
  you make one): the source pool pins every connection read-only at the session
  level and proves it with a rolled-back probe `INSERT` before reading anything.
- [x] **Repo flip** — done in `faa5f4d` (PR #25): legacy code deleted, `v2/`
  contents moved to the repo root. Paths in this runbook are now root-relative.

---

## 3. Environment for the real run

Every real-run step goes through **one entry point**, which reads **`.env.PROD`**:

```bash
pnpm migrate:prod            # prints the steps and what each one does
```

It loads `.env.PROD` (override with `--env-file <path>`), sets
`BACKFILL_PROFILE=prod`, forces `AGENT_MODE=false`, defaults
`TARGET_DATABASE_URL` to `DATABASE_URL`, echoes the source/target/bucket/CDN it
resolved, and then shells out to the underlying script. Nothing in the real path
reads `.env` any more, so a stray local dev env cannot be picked up by accident.

| Var | Real-run value | Used by |
| --- | --- | --- |
| `LEGACY_DATABASE_URL` | **old** prod DB connection string | backfill source |
| `DATABASE_URL` | fresh prod DB (new schema) | backfill/verify target, seed-sweep, prisma |
| `TARGET_DATABASE_URL` | leave blank unless the migration target differs from `DATABASE_URL` | backfill/verify target |
| `AWS_ENDPOINT_URL` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` / `AWS_REGION` | R2 credentials + bucket | real asset upload |
| `REDIS_URL` | prod Redis (`noeviction` + AOF — see [SELF-HOSTING.md](./SELF-HOSTING.md#redis-required)) | beacon set, quarantine queue |
| `NEXT_PUBLIC_CDN_URL` | `https://cdn.kytelink.com` | rewritten asset/link URLs |
| `ADMIN_EMAILS` | comma-separated admin emails | `role=ADMIN` mapping |
| `BACKFILL_STATE_DIR` | an **absolute** path outside the repo | checkpoints + manifests |
| `STAGING_BASE_URL` | new stack's public base (e.g. `https://kytelink.com`) | visual-diff `newUrl` |
| `MODERATION_PROVIDER` / `OPENAI_API_KEY` | `openai` + key (else deterministic-only) | seed-sweep AI pass |
| `DOMAIN_PROVIDER` / `VERCEL_TOKEN` / `VERCEL_TEAM` / `VERCEL_PROJECT` | `vercel` + project creds | custom-domain attach + the 48h reaper |

**`BACKFILL_STATE_DIR` must be an absolute path and identical across the warm-up
(A2) and launch (B3) runs** — it holds the `assets-map` (so hours-long asset
downloads are skipped on re-run) and the `source-hash` (so delta knows which rows
changed). A relative path resolves against whatever directory the step ran from.

**The v1 connection string does not need a read-only role.** The source pool
pins every connection to `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`,
and each run still proves it empirically with a probe `INSERT` inside a
transaction that is always rolled back — so the owner connection string is safe,
and the run aborts if the probe is ever accepted. A dedicated read-only role is
still fine if you have one; pass it as `LEGACY_READONLY_URL`.

> The backfill's `setup` / `fixture` / `edit` / `reset` / `e2e` subcommands are
> **fixture-only** (they create, load and drop the synthetic scratch DBs). They
> are now **refused outright** under `BACKFILL_PROFILE=prod`, which every
> `pnpm migrate:prod` step sets.

Apply the schema, ClickHouse migrations and the owned CDN assets in one step:

```bash
pnpm migrate:prod schema
```

---

## 4. Real vs stubbed seams (what `--execute` really does)

`backfill --execute` (and `--real-assets`) binds the **real** pipeline; the fast
unit tests and dry-runs use in-memory stubs. What runs for real on your machine:

| Seam | `--execute` (real) | Notes |
| --- | --- | --- |
| **ImageFetcher** | `SsrfGuardedImageFetcher` — real `fetch`, http(s)-only, DNS-checked against private ranges, ×5 retry, 30s timeout, ≤25 MB, ≤3 redirects | fetches from the real legacy hosts |
| **normalize** | `sharpNormalizeModule` **imported directly from `apps/api`** — the exact production sharp encoder (webp + LQIP) | not a copy; compile-time bound |
| **AssetStore** | `S3AssetStore` — real R2/S3 `PutObject`, immutable cache headers, `u/{kyteId}/…` layout | HEAD-verified |
| **BeaconValidationSink** | `RedisBeaconSink` — writes the real `analytics:kyte-map:{username}` keys the API reads | otherwise migrated profiles' analytics silently drop until first republish |

`verify` defaults to checking the **target DB rows + the run's checkpoint
records** (rehydrated asset sizes/keys + beacon entries). **`verify --live`** —
which is what `pnpm migrate:prod verify` runs — swaps those for a real R2
`HeadObject` per migrated asset and a real Redis `SCAN` for the beacon
cardinality, so the launch gate proves the objects are actually in the bucket at
the right size rather than merely recorded in a local file.

---

## 5. PHASE A — Warm-up (dark, no user impact)  · owner: founder

### A1 — Deploy the new stack dark on staging URLs
Fill `.env` per [SELF-HOSTING.md](./SELF-HOSTING.md), deploy api + worker + the
three web zones on staging URLs, run the ~5-min smoke test manually (login, edit,
publish, upload, analytics render). **Abort/hold** if any smoke step fails — fix
before proceeding; the old stack is untouched, so there is no time pressure yet.

### A2 — Preflight, then the warm-up seed (assets take hours — start FIRST)
```bash
pnpm migrate:prod preflight   # must print RESULT: READY TO SEED
pnpm migrate:prod seed        # full mode
```
Preflight is the "is prod actually prod" gate: it validates the env (real auth
secrets, non-localhost base URLs, real email provider, admin emails, agent mode
off), confirms the target has the Prisma migrations applied, **fails if the
target holds any sample-seed or agent-mode rows**, proves the v1 connection is
read-only and non-empty, PINGs Redis, does a real put→head→delete round trip
against the R2 bucket, and checks ClickHouse and the CDN hostname. Blockers fail
the step; launch-only issues print as `WARN` so the seed can proceed while you
fix them before DNS.

If it reports seeded test rows:
```bash
pnpm migrate:prod purge-test-data          # lists what it would delete
pnpm migrate:prod purge-test-data --yes    # deletes it
```

The seed reads old prod (read-only), builds users/orgs/kytes/published/domains/
accounts in the fresh prod DB, downloads + normalizes + uploads every image,
rewrites the link/avatar references, and builds the Redis beacon set.
Re-runnable: assets are skipped by URL hash, so a crash + re-run resumes in
minutes.

**Abort criteria (A2):**
- The read-only probe is NOT rejected (the session-level pin did not take and the
  role can write) → **stop immediately**. The script aborts on its own here, and
  the probe was rolled back, so v1 is untouched.
- `quarantined` users, `username collisions`, or `nulled` usernames appear that you
  did **not** expect → review `${BACKFILL_STATE_DIR}/manifests/quarantine.jsonl`;
  these are human-reviewed, never silently dropped.
- Asset `failed` count is far above the known-dead-links baseline (some dead
  `i.ibb.co` links are expected) → inspect `assets-failed.jsonl`; a systemic
  failure (all of one host) means a fetch/credential problem, not dead data.

### A3 — Moderation seed-sweep (spam launches already dark)
```bash
pnpm migrate:prod sweep
```
Reviews **every** seeded published kyte before it goes live: deterministic checks
first (brand keywords, punycode/lookalike hosts, URL blocklists, sketchy TLDs,
free-mail impersonation), then the AI provider over the content ("not too
aggressive" — ambiguous/low-confidence approves). Each verdict writes a normal
`ModerationReview` with its tripped **signals** (so admin filtering works on day
one); suspending verdicts enqueue the asset-quarantine move (`u/…` → `q/…`).

**Abort criteria (A3):** the suspended count is wildly higher than your spam
estimate → the sweep may be too aggressive; inspect the admin suspended view's
signal filters before continuing. This runs in the warm-up window, not the
downtime, so there is room to tune.

### A4 — Verify (dress rehearsal of the launch gate)
```bash
pnpm migrate:prod verify    # exits non-zero unless it prints "100% PASS"
```
Must print **`RESULT: 100% PASS`**. Checks: counts (users/orgs/kytes/published/
domains/accounts/**org memberships**, each `new == old − quarantined`), display-field
checksums old vs new, **content-parseable** (every migrated row validates under
`profileContentSchema` — editor/API-safe), avatar losslessness, assets, auth
provider mapping (both OAuth providers present, zero orphans), beacon-set
cardinality == published count, vcf dropped, banned preserved, quarantine accounted.

### A5 — Visual-diff gallery (the "renders identically" eyeball)
```bash
pnpm migrate:prod gallery
open "$BACKFILL_STATE_DIR/manifests/visual-diff-gallery.html"
```
Renders each migrated profile old vs new side by side with a per-profile field
diff verdict, plus the live `oldUrl`/`newUrl` pair. On launch day (both stacks
briefly reachable) click each pair to compare the real pages — that is the pixel
step from the `18-migration.md` spec. Dead legacy avatars fall
back to initials by design (null-avatar policy), not a rendering bug.

---

## 6. PHASE B — Launch day (~15 min downtime)  · owner: founder

### B1 — Take the old site down
Put up the static "back in 15 minutes 🪁" notice (or park DNS). From here the user
set is fully frozen.

### B2 — Snapshot the old prod DB
Take a final backup/snapshot **before** the delta seed — rollback insurance beyond
the read-only guarantee.

### B3 — Delta seed (only rows changed since A2)
```bash
pnpm migrate:prod delta       # SAME BACKFILL_STATE_DIR as A2
```
Delta compares each row's `source-hash` to the warm-up checkpoint and re-copies
only the users/kytes/domains that changed during the warm-up window (plus their
assets). Minutes, not hours. **Abort:** if `changed` is implausibly large (≈ full
set), the checkpoint dir differs from A2's — fix `BACKFILL_STATE_DIR` and re-run.

### B4 — Delta moderation sweep
```bash
pnpm migrate:prod sweep       # idempotent; re-reviews changed rows
```

B3+B4+B5 in one go: `pnpm migrate:prod cutover`.

### B5 — Verify — THE LAUNCH GATE
```bash
pnpm migrate:prod verify
```
**MUST print `RESULT: 100% PASS` and exit 0.** If it does not: **do not flip DNS.**
Read the failing check, fix, re-run. The old stack is still down but intact — you
can restore the notice indefinitely. This runs `verify --live`, so the `assets`
check is a real R2 `HeadObject` per object and `beacon-set` a real Redis `SCAN`.

### B6 — Point DNS at the new stack
Flip `kytelink.com` + `admin.kytelink.com` to Vercel/Render. Watch propagation
(TTL was lowered in §2).

### B7 — Scripted smoke test on production URLs (~5 min)
OTP login (typed AND magic-link) + Google + GitHub → edit → autosave → publish →
revalidation lands → beacon in ClickHouse → fresh analytics render → custom domain
resolves → admin populates and the **suspended view shows the seed-sweep results
with signal filters working** → fresh signup onboards → second kyte → teammate
invited/accepted → schedule fires → a planted phishing profile is suspended <60s →
the suspended shell renders. **Abort → rollback (§7)** if a core flow (login/
publish/profile render) is broken.

### B8 — Enable signups 🎉
Flip the signup gate on. Freeze the old DB + old codebase for 90 days.

---

## 7. Rollback

- **Pre-flip (through B5):** nothing to roll back — the old stack is untouched
  until DNS moves. Keep the "back in 15 minutes" notice up as long as needed.
- **Post-flip (after B6):** point DNS **back** at the old stack (keep it warm 72h).
  Any writes made on the new stack during the gap are enumerable via `updatedAt`
  and replayable — an accepted risk given the short window. The B2 snapshot is the
  deeper insurance.

---

## 8. Command quick-reference

```bash
# Real run (founder) — all of these read .env.PROD:
pnpm migrate:prod                        # list the steps
pnpm migrate:prod preflight              # env + both DBs + Redis + R2 + CDN, and the no-test-data gate
pnpm migrate:prod schema                 # prisma migrate deploy + clickhouse migrate + cdn assets → R2
pnpm migrate:prod purge-test-data --yes  # only if preflight found seeded rows
pnpm migrate:prod seed                   # A2 warm-up full seed
pnpm migrate:prod sweep                  # A3 / B4 moderation sweep
pnpm migrate:prod verify                 # A4 / B5 gate (100% PASS, live bucket + Redis)
pnpm migrate:prod gallery                # A5 gallery
pnpm migrate:prod delta                  # B3 launch delta

pnpm migrate:prod all                    # schema → preflight → seed → sweep → verify
pnpm migrate:prod cutover                # delta → sweep → verify

# Fixture proving only (agents' scratch DBs — refused under BACKFILL_PROFILE=prod):
cd tools/seed && pnpm backfill setup | fixture | edit | e2e | reset
```

Underlying flags (if you call `pnpm backfill` directly): `--env-file <path>`
loads a dotenv file without overriding exported vars; `--execute` writes (default
is dry-run); `--delta` re-copies only changed rows; `--live` makes `verify` hit
the real bucket and Redis; `--stub-assets` forces the networkless stub (refused
under the prod profile); `--real-assets` forces the real pipeline for a dry-run
asset test.

---

## 9. Known gaps / founder-must-do

- **G1 — CLOSED.** `verify --live` (what `pnpm migrate:prod verify` runs) issues a
  real R2 `HeadObject` per migrated asset and compares its byte size to the `Asset`
  row, and reads the beacon cardinality from a real Redis `SCAN`. Plain
  `pnpm backfill verify` is still checkpoint-derived — use `--live` for real data.
- **G2 — Visual pixel-diff needs both stacks live.** The A5 gallery proves
  data-level render fidelity offline. The true pixel comparison (old-prod page vs
  new-staging page) requires the old site still reachable — do it during A5 (before
  B1) by clicking the `oldUrl`/`newUrl` pairs, or briefly against staging.
- **G3 — Real credentials are yours to supply.** Agents never had OAuth secrets, R2
  keys, Resend keys, or the old-prod connection string. Fill them into `.env.PROD`
  per §3 + [SELF-HOSTING.md](./SELF-HOSTING.md). `pnpm migrate:prod preflight`
  names every one that is missing, placeholder, or still pointing at localhost.
- **G4 — Moderation AI pass is optional.** With no `MODERATION_PROVIDER=openai` +
  `OPENAI_API_KEY`, the seed-sweep runs deterministic checks only (still catches
  brand/blocklist/punycode/free-mail spam). Set the provider for the full content
  pass.
- **G5 — `og-image` generation** for migrated published kytes is enqueued but
  worker-driven; ensure the api **worker** process is running during warm-up so og
  cards are ready before the flip (cards are text-only until generated).

---

## 10. Proof this works (fixture run, this repo)

Everything above was proved end to end against the synthetic legacy **fixture** DB
(`kyte_legacy_fixture` → `kyte_migration_target`, isolated scratch databases),
with the **real** sharp-normalize + SSRF-guarded fetch + real MinIO + real Redis
wired via `backfill --execute`. Latest run:

- **`verify` → `RESULT: 100% PASS`** — all 10 checks green (counts 22/22 across
  users/orgs/members/kytes, published 20/20, domains 3/3, accounts 15/15;
  checksums match; content-parseable; avatar-losslessness; auth google+github, 0
  orphans; beacon set 16/16; vcf dropped; banned 1/1; 2 quarantined users
  accounted). `Kyte.id = old userId` preserved; vcf + analytics excluded.
- **Resumability** — an injected crash after 6 kytes left a valid checkpoint; the
  resume run completed to 22 with no duplication; verify still 100% PASS.
- **Delta** — a simulated warm-up-window edit re-copied exactly the 2 changed rows
  (`changed=2`) and propagated (`"EDITED during warm-up window"`, `"Github Edited"`);
  a full idempotent re-run skipped all assets via checkpoint.
- **Real asset success path** — the real seam trio wrote genuine 512×512 avatar +
  256×256 link-image webp objects (+ LQIP) into MinIO under isolated keys,
  HEAD-verified byte-for-byte (`prove-real-asset-pipeline.manual.ts`).
- **Asset-failure path** — all 10 synthetic legacy image URLs (dead DNS / 403 / 404)
  routed to `assets-failed.jsonl` with the null-avatar policy applied — no crash.
- **Quarantine round-trip** — real `processQuarantineJob` moved objects `u/→q/` on
  suspend and `q/→u/` on restore in MinIO, idempotently.
- **Seed-sweep** — suspended a planted phishing profile (brand keyword + blocklist
  URL + free-mail impersonation), wrote its signals, enqueued asset quarantine;
  clean profiles approved.
