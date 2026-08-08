# 25 — Self-hosting: repo docs, .env.example, and graceful degradation

*Read this if: you're building the scaffold, the API's env/boot layer, or the open-source feature page. This doc owns the **capability matrix** — the single source of truth for what turns off when an optional service is missing.*

Kytelink is an open-source project first. **Zero parts of the app are closed, and we use no third party that lacks an open-source or self-hostable equivalent** (R2→MinIO/any S3, Resend→SMTP, ClickHouse Cloud→ClickHouse OSS, Neon→plain Postgres, OpenAI→any OpenAI-compatible endpoint including local models, Vercel domains→manual DNS). The docs and the boot behavior must make that obvious and easy.

## Repo documentation (the new repo ships these)

- **`README.md` — simple.** What Kytelink is, one screenshot, quickstart (`pnpm i && docker compose up -d && pnpm dev`), and prominent links out: **`SELF-HOSTING.md`**, `CLAUDE.md` ([24-agents.md](24-agents.md)), contributing. No walls of text — the README sells and points.
- **`SELF-HOSTING.md` — the real guide.** Sections:
  1. **The promise:** fully open source, no mandatory SaaS; the founder's hosted stack is just one example config.
  2. **Fastest path:** docker compose (everything included) → fill the handful of required vars → running in 15 minutes.
  3. **Per-service setup, one section each:** Postgres (compose / any managed — connection string is all we need), Redis (compose / managed), ClickHouse (compose / OSS on a VM / Cloud — optional, see matrix), S3 storage (MinIO compose / R2 / AWS — optional), email (console / SMTP / Resend), moderation (off / any OpenAI-compatible endpoint), custom domains (manual DNS / Vercel API). Each: what it's for, a compose or setup snippet, the env vars it fills.
  4. **The capability matrix** (below) — what you lose by skipping optional services, verbatim.
  5. Production notes: the ISR cache volume, running `PROCESS_ROLE=worker` separately, backups — Postgres is the can't-lose store (`pg_dump`/PITR per provider; the founder's hosted stack relies on Neon PITR), the bucket holds irreplaceable user uploads (periodic sync/replication recommended), ClickHouse loss is accepted as lossy analytics.
- **`.env.example` — excellent.** Grouped exactly like the [02-architecture.md](02-architecture.md) contract, every var commented (what it does, example value, required-or-optional, what breaks without it), optional groups clearly headed "OPTIONAL — skip to disable X", dev-only vars quarantined at the bottom with warnings.

## Incremental env validation (boot behavior, built in `packages/schemas` + `apps/api`)

Validation is **tiered**, not all-or-nothing:

- **Required to boot:** `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `INTERNAL_API_SECRET`, base URLs. Missing → the server **refuses to start** with a readable list of what's missing and one line on where to get it.
- **Optional capability groups:** each missing group logs ONE clear boot warning — `⚠ analytics disabled: CLICKHOUSE_URL not set (see SELF-HOSTING.md)` — sets the capability off, and the app runs happily without it. Never a crash, never a runtime stack trace from a missing optional var.
- Boot computes a single **`capabilities` object** (`{ analytics, uploads, emailDelivery, moderation, oauthGoogle, oauthGithub, domains }`), exposed to all apps via an internal endpoint/tRPC context. Every gate in code checks capabilities — nobody re-reads env vars ad hoc. Log shipping to ClickHouse piggybacks the **analytics** capability — off means pino logs stay on stdout only ([06-api.md](06-api.md)).

## The capability matrix (single source — SELF-HOSTING.md quotes it, code implements it)

| Missing | Capability off | What the user sees |
|---|---|---|
| `CLICKHOUSE_URL` | **analytics** | Beacon endpoints return 202 and drop; the editor has no Analytics tab; admin Live/Traffic views show a friendly "Analytics is off — set CLICKHOUSE_URL" card; server logs stay on stdout (no `app_logs`). Everything else works. |
| `AWS_*` (S3) | **uploads** (the whole image concept) | Upload tiles hidden; onboarding's avatar step offers only the built-in default avatars (locally generated initials SVGs — no third party); profiles render clean without avatars; OG cards fall back to text-only; owned/static assets still work (serve `packages/cdn` locally and point `NEXT_PUBLIC_CDN_URL` at it). |
| `RESEND_API_KEY`/SMTP | **emailDelivery** → console | OTPs and invites print to server logs (mailpit shows them in compose); everything functions — you just read codes from the console. |
| `OPENAI_API_KEY` | **moderation** → none | Publishes auto-approve; the feature is invisible ([10-moderation.md](10-moderation.md)). The AI "Other" link import is hidden too; Linktree/Beacons/Bio.link imports still work (deterministic parsers, [06-api.md](06-api.md)). |
| `GOOGLE_*` / `GITHUB_*` | that OAuth button | Hidden from the auth screen; email OTP always works. |
| `VERCEL_*` | **domains** → manual | Custom-domain UI shows DNS instructions instead of automated verification. |

Rules for implementers: a disabled capability means the UI surface is **absent or replaced with one calm explanatory card** (never a broken button or error toast); its tRPC procedures return a typed `FEATURE_DISABLED` error as the backstop; product events for disabled features simply don't fire. [17-quality.md](17-quality.md) tests each degraded boot (start without CH → warning logged, analytics gone, all else green; start without S3 → same for uploads).

## On the landing page

`/features/open-source` ([12-landing.md](12-landing.md)) tells this story to humans: fully open source, compose quickstart, "runs without ClickHouse or S3 — features switch off gracefully, nothing breaks," and links to `SELF-HOSTING.md` on GitHub. The footer's "self-hosting guide" link points there too.
