# 02 — Architecture: monorepo, topology, flows, caching, env

*Read this if: you're the orchestrator or building any app/package. Companion: [03-database.md](03-database.md), [06-api.md](06-api.md).*

Versions: pin latest stable at implementation time. Minimums: Node 22, Next 15 (pages router), React 19, Fastify 5, tRPC 11, Prisma 6, Tailwind 4, zod 4, better-auth 1.x, BullMQ 5, `@clickhouse/client` 1.x, ioredis 5, pnpm + Turborepo.

## Monorepo rules (DRY, enforced)

Layout is in [README.md](README.md). Rules:

- `packages/schemas` is dependency-free (zod only) — the single source of truth for domain types. Prisma types never leak past `db`; ClickHouse rows never leak past `clickhouse`.
- **ProfileView exists once** in `packages/ui`, consumed by: the public profile page, the editor live preview, and the landing demo. No second renderer, ever.
- `apps/web` never imports `packages/db` — profile data flows through the API (one data path, one cache).
- Strict TS everywhere; `any`, `@ts-ignore`, `console.log` are lint errors.
- All shared logic (S3 normalize pipeline, reorder helper, cdn url helper) lives in exactly one exported module — no copy-paste between streams.

## Runtime topology (hosted)

```
kytelink.com ─▶ apps/web ── middleware: "/" → landing zone; custom-host → /:username rewrite
                 │  /:username = static HTML from CDN (zero DB/API at request time)
admin.kytelink.com ─▶ apps/admin ─┐
api.kytelink.com ─────────────────┴▶ apps/api (Fastify)
   /trpc/* (cookie auth) · /auth/* (better-auth) · /t/* (beacons) · /internal/* (HMAC)
   BullMQ workers: moderation, image-process, og-image, revalidate, scheduled-publish, sitemap, cleanup
        ├─▶ Postgres  (users, kytes, memberships, invites, assets, domains, moderation, schedules)
        ├─▶ ClickHouse (page_hits, link_hits, product_events + rollup MVs)
        └─▶ Redis     (caches, rate limits, queues, beacon buffer)
cdn.kytelink.com ─▶ R2 bucket (S3 API; MinIO locally)
   ├── static/…      our owned assets, synced from packages/cdn (09-cdn.md)
   └── u/{kyteId}/…  user uploads (08-media.md)
```

Hosted deployment shape (founder-confirmed — this is *his* env, not a requirement): the three Next apps deploy to Vercel (web needs Vercel's persistent ISR cache for the static-profile model); **`apps/api` (server + workers) runs on a render.com instance**; **Postgres on Neon** (pooled `DATABASE_URL` + `DIRECT_URL` for migrations — our schema already supports both); **ClickHouse Cloud**; **Redis on Render**. Treat the API box's CPU as ours to budget: image processing is queue-capped ([08-media.md](08-media.md)), CH inserts are async, nothing CPU-heavy runs in request handlers.

**Self-hostability is a hard constraint, not a footnote** (open-source project): the code speaks only standard connection strings and protocols — plain Postgres, plain ClickHouse, plain Redis, any S3 API, any SMTP. Zero Neon-, ClickHouse-Cloud-, Render-, or Vercel-specific features anywhere in application code. The repo README leads with the self-host path (`docker compose up`) and documents every provider swap (email `resend→smtp`, storage R2→MinIO→AWS, domains `vercel→manual`, moderation `openai→none`); the founder's hosted stack is one example config among many.

Self-host = `docker compose up`: same topology on one box; MinIO for S3, mailpit for email preview, `MODERATION_PROVIDER=none`, `DOMAIN_PROVIDER=manual`, `EMAIL_PROVIDER=console|smtp`.

## Request flows that matter

1. **Profile view:** CDN serves static HTML (<50ms TTFB). Client fires `sendBeacon('/t/page')`. Nothing blocks, nothing touches Postgres.
2. **Publish:** tRPC (permission-checked, [04-organizations.md](04-organizations.md)) → snapshot draft → `PublishedKyte` (tx) → enqueue moderation + revalidate → worker POSTs HMAC-signed revalidate to web → CDN fresh in seconds.
3. **Scheduled publish:** schedule row fires at `scheduledFor` → same publish pipeline (moderation included) → revalidate ([04-organizations.md](04-organizations.md)).
4. **Moderation:** content-hash skip → deterministic checks → AI verdict → SUSPENDED sets status + revalidates (suspended shell) + admin queue. Publish is never blocked; p95 flag-to-takedown <60s. Every publish is reviewed (hash-cached).
5. **Editor analytics:** tRPC → CH rollups → Redis 60s.
6. **Custom domain:** middleware host→username lookup (Redis-cached internal endpoint) → rewrite to the same static page.
7. **Invite:** owner invites email → Resend email → recipient logs in → accepts on `/invites` → membership created ([04-organizations.md](04-organizations.md)).

## Caching inventory

One owner per cache: the owning module in `apps/api` both writes and busts it; no cache written from two places.

| Layer | What | TTL / bust |
|---|---|---|
| CDN | profile HTML, landing, sitemaps, all bucket assets | until revalidate / immutable |
| Redis | `profile:{username}` JSON (internal endpoint) | 300s + bust on publish |
| Redis | `domain:{host}` → username, **misses cached as a NONE tombstone** (hostname floods never hammer the API) | 300s hit / 60s miss + bust on domain change |
| Redis | `analytics:{kyteId}:{query}:{args}` | 60s |
| Redis | beacon `username↔kyteId` validation set | rebuilt on publish |
| Redis | rate buckets, BullMQ queues, beacon buffer | rolling |
| CH MVs | daily rollups | continuous |

## Environment contract (🔴 required to boot; everything else optional with graceful degradation — [25-selfhost.md](25-selfhost.md))

```
# REQUIRED — the server refuses to start without these
DATABASE_URL🔴 REDIS_URL🔴 AUTH_SECRET🔴 INTERNAL_API_SECRET🔴
WEB_BASE_URL🔴 API_BASE_URL🔴 LANDING_ZONE_URL🔴
DIRECT_URL ADMIN_EMAILS
# OPTIONAL — analytics (missing → boot warning, analytics capability off)
CLICKHOUSE_URL CLICKHOUSE_PASSWORD
# OPTIONAL — uploads/images (S3-compatible: R2 hosted, MinIO local, AWS-swappable — always AWS_*;
#   missing → boot warning, the entire image concept off)
AWS_ENDPOINT_URL AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION(auto) AWS_S3_BUCKET
NEXT_PUBLIC_CDN_URL   # public base for assets; non-secret, client-visible
# OPTIONAL — auth providers (missing → that button hidden; email OTP always works)
GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET
# OPTIONAL — email delivery (EMAIL_PROVIDER=resend|smtp|console; console default = codes in logs)
EMAIL_PROVIDER RESEND_API_KEY EMAIL_FROM("Kytelink <auth@mail.kytelink.com>")
SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD
# OPTIONAL — moderation + the AI "Other" link import (none default; hosted uses openai)
MODERATION_PROVIDER OPENAI_API_KEY OPENAI_BASE_URL MODERATION_MODEL
# OPTIONAL — domains (manual default)
DOMAIN_PROVIDER VERCEL_TOKEN VERCEL_TEAM VERCEL_PROJECT
# Local/dev only — NEVER set in hosted envs
AGENT_MODE           # true → agent logins + dev-login endpoint; API refuses to boot with it in production (24-agents.md)
AUTH_MOCK_PROVIDERS  # true → dev-only mock OIDC provider for E2E OAuth (05-auth.md); refused in production
```

Dev ports: web 3000 · landing 3001 · admin 3002 · api 3003 · local CDN 5002. **Agent mode** runs everything on port+1000 with seeded agent logins so AI agents can drive the product without colliding with a human dev — [24-agents.md](24-agents.md).

Validation is **tiered** ([25-selfhost.md](25-selfhost.md)): missing required vars → refuse to start with a readable list of what is missing and where to get it; each missing optional group → ONE boot warning + that capability switched off (UI surfaces disappear; procedures return typed `FEATURE_DISABLED`). Boot computes a single `capabilities` object every app consumes — nobody re-reads env ad hoc. The founder's hosted env sets everything; a minimal self-host sets only the 🔴 vars. Gone forever: `POSTHOG_*`, `CLOUDFLARE_TOKEN/ACCOUNT`, `LOOPS_API_KEY`, `NEXT_PUBLIC_GTAG*`, `SHADOW_DATABASE_URL`. No secrets in `NEXT_PUBLIC_*`.
