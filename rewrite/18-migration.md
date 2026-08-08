# 18 — Legacy seed & launch (zero data loss)

*Read this if: you're building `tools/seed` or planning launch. Companion: [01-parity.md](01-parity.md), [03-database.md](03-database.md), [04-organizations.md](04-organizations.md).*

**Mental model (founder-confirmed): this is a SEED, not a live migration.** The old codebase is being fully retired — the two stacks never run side by side and nothing stays in sync. On launch day the old site simply goes down (~15 minutes of full downtime is accepted), the fresh database gets seeded from the old one, and the new stack comes up already populated. There is no maintenance mode, no dual-write, no coexistence machinery — none of that gets built. Signups on the live site have already been disabled for months (since May 2025), so the user set is frozen — only existing-user edits drift between warm-up and launch, which is exactly what delta mode re-copies.

All scripts: standalone tsx, idempotent, resumable (checkpoint table), `--dry-run` default / `--execute` to write. The old DB is accessed with a **read-only role** — nothing ever writes to it.

## Order of operations

**The actual sequence (founder-confirmed):** agents write ALL the code first — every app, the API, the cdn package, and these seed scripts — against docker-compose with zero real credentials. The scripts are proven against a synthetic **legacy fixture DB** (a docker Postgres loaded with the OLD schema + generated data covering every edge case in [01-parity.md](01-parity.md)) that W8 creates as part of this workstream. Then the founder fills `.env` from the README (fresh Neon **staging** DB first; prod later), tests the whole product, and iterates. **At the very end**, the founder alone runs the seed with a read-only connection to the old prod database — so the scripts must work correctly on their first real execution.

The seed's job, restated: the old schema has no orgs — the script **builds the entire org layer** (personal org + OWNER membership per user), maps draft/prod content into Kyte/PublishedKyte, and **downloads every image from whatever legacy host it lives on** (Cloudflare Images, Supabase, CloudFront, i.ibb.co) and re-uploads it to the new bucket under the new per-kyte prefix. All user data secure, just reorganized.

```
Before launch day (no user impact):        Launch day (~15 min full downtime):
1. seed proven on the legacy fixture DB     1. take the old site down (simple static
2. optional warm-up: run the seed early        "back in 15 minutes 🪁" notice, or DNS)
   against old prod (read-only) into the    2. run the seed (delta mode if warmed up:
   fresh prod DB — especially assets,          only rows changed since the warm-up)
   which take hours to download (~25k kytes)        3. verification suite → must print 100% PASS
3. new stack fully deployed dark on         4. point DNS at the new stack
   staging URLs, env filled, smoke-tested   5. scripted smoke test on production URLs
                                            6. signups ENABLED 🎉
                                            7. old DB + old codebase frozen 90 days
```

## Pre-launch external setup (founder-only; LAUNCH-RUNBOOK.md expands each)

The agents build everything with zero real credentials; the founder then fills `.env` locally and sets up the real services himself. This checklist collects every founder-side step so launch day holds no surprises:

- **OAuth apps:** ADD the new redirect URIs (`https://api.kytelink.com/auth/callback/google|github`) to the existing Google + GitHub OAuth apps — add, don't replace, so the old site keeps working until the flip.
- **Email:** verify `mail.kytelink.com` in Resend (SPF/DKIM/DMARC) well ahead — DNS propagation takes time.
- **CDN/bucket:** create the R2 bucket, point `cdn.kytelink.com` at it, add the Cloudflare rule blocking `/q/*` (the quarantine prefix — [08-media.md](08-media.md)), run the owned-assets sync once.
- **Repo flip:** the monorepo is developed in `v2/` of this repo ([README.md](README.md)); before the public GitHub push, delete the legacy code and move `v2/`'s contents to the repo root (mechanical `git mv`; CI must be green after).
- **Provisioning:** Neon prod DB, ClickHouse Cloud, Render (api server + worker + Redis), the three Vercel projects with their domains (`kytelink.com`, `admin.kytelink.com`; `www` stays a Vercel-level redirect to apex).
- **DNS TTL:** lower the TTL on the `kytelink.com` records to ~60s days in advance — the ~15-minute window assumes fast propagation.
- **Snapshot:** take a final backup/snapshot of the old prod DB immediately before the seed (rollback insurance beyond the read-only guarantee).

## Cannot-lose scope

Users + auth account links (Google AND GitHub) + drafts + published profiles (incl. `banned` → `moderationStatus: BANNED`) + domains + every referenced image. Sessions may drop (re-login OK). **Deliberately dropped (founder-confirmed):** the legacy `vcf` JSON (dead since 2023, no UI renders it) and **all legacy analytics** — `HitPage`/`HitLink` are ignored and wiped; ClickHouse starts empty at launch and counts begin fresh. Both exclusions are excluded from checksums.

## Scripts

- **`01-users`** — old `User` → new `User` (same id; `role=ADMIN` if in `ADMIN_EMAILS`). next-auth `Account` rows → better-auth accounts. Staging test: a Google user, a GitHub user, AND a magic-link-era user all successfully log in.
- **`02-kytes`** — per user: create personal `Organization` + `OrgMember(role=OWNER, kyteAccess=ALL)`; `KyteDraft` → `Kyte` (**id = old userId**, orgId = personal org; the legacy `vcf` column is NOT carried), `KyteProd` → `PublishedKyte` (+ contentHash) ([04-organizations.md](04-organizations.md)). Normalizations: lowercase usernames (case-collision check first — report, don't guess); links/icons coerced through zod in **lenient mode** (unknown fields preserved in a `legacy` bag; hard failures → `quarantine.jsonl` for human review — never silently dropped, never aborting). Drafts without prod, null usernames, duplicate emails: handled explicitly and counted. Personal-org name fallback chain (legacy users can have null names): user name → username → email local-part → "My Kytelink". Enqueue og-image generation for every published kyte post-backfill, and **bulk-build the Redis beacon-validation set (`username↔kyteId`) for every published kyte** — otherwise every migrated profile's analytics silently drop at launch until its first republish. The verification suite asserts the set's cardinality equals the published-kyte count.
- **`03-domains`** — `Domains.userId` → `kyteId` (same value).
- **`04-moderation`** — **the pre-launch spam sweep (founder-confirmed): every seeded published kyte is reviewed BEFORE it goes live**, so the spam wave launches already suspended. Runs during the warm-up window (not inside the 15-min downtime; delta pass at launch for rows that changed): deterministic checks on everything first (free — brand keywords, punycode, URL blocklists, redirect targets, sus email domains), then the AI provider over the published content ([10-moderation.md](10-moderation.md) policy verbatim — "not too aggressive": ambiguous/low-confidence → approve). Batched, concurrency-capped, resumable by kyteId checkpoint; each verdict writes a normal `ModerationReview` with its tripped **signals**, so launch-day admin filtering works immediately; suspending verdicts also enqueue the asset-quarantine move ([08-media.md](08-media.md)) so spam images are dark at launch. Output: a summary count by category for the founder to eyeball before DNS flips.
- **`05-assets`** — **riskiest; start FIRST.** Every distinct `pfp` + link-image URL (hosts: imagedelivery.net, *.supabase.co, cloudfront, i.ibb.co): download (retry ×5, 30s timeout, SSRF-guarded) → run through the **shared** normalize pipeline imported from the media module ([08-media.md](08-media.md)) → upload `u/{kyteId}/avatar/{ulid}.webp` (links → `…/links/…`, emoji field rewritten) → Asset row + FK. Failures → `assets-failed.jsonl` (expect dead i.ibb.co links); policy: null avatar over broken avatar; list human-eyeballed. Re-runs skip by URL hash → run for days pre-launch, delta on launch day.

## Verification suite (`verify`) — the launch gate; must print 100% PASS

- **Counts:** users/orgs/kytes/published/domains/accounts/**org memberships** (each = user count): `new == old − quarantined`; quarantine human-reviewed.
- **Checksums:** per-kyte canonical-JSON of display-relevant fields old vs new (after documented normalizations); mismatches listed by id.
- **Assets:** every migrated image: Asset row + bucket HEAD + size match + dimensions present.
- **Auth spot-check:** N random users' provider mappings (both OAuth providers represented).
- **Visual regression:** top-100-by-traffic + 200 random + every theme × content-shape edge case: old prod URL vs new staging URL screenshots, pixel-diff with tolerance, human-reviewed gallery. This is the "renders identically" proof.

## Launch smoke test (scripted, ~5 min)

OTP login (typed AND magic-link) + Google + GitHub → edit → autosave → publish → revalidation lands → beacon in CH → fresh analytics render → custom domain resolves → admin populates, **suspended view shows the seed-sweep results with signal filters working** → fresh signup onboards → **second kyte created → teammate invited/accepted → schedule fires** → planted phishing profile suspended <60s → suspended shell renders.

## Rollback

Pre-flip: nothing to roll back — the old stack is untouched until DNS moves. Post-flip: point DNS back at the old stack (kept warm 72h). Any writes made on the new stack during the gap are enumerable via `updatedAt` and replayable — accepted risk given the short window.
