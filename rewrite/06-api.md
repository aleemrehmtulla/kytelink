# 06 — API app: Fastify + tRPC + workers + security

*Read this if: you're building `apps/api` or any consumer of it. Companion: [03-database.md](03-database.md), [04-organizations.md](04-organizations.md), [05-auth.md](05-auth.md), [07-analytics.md](07-analytics.md), [08-media.md](08-media.md), [10-moderation.md](10-moderation.md).*

One deployable, `PROCESS_ROLE=server|worker|all` (compose runs `all`; hosted splits).

## HTTP surface

- `POST /trpc/*` — tRPC 11 Fastify adapter. Context `{ session, user, ip, redis, db, ch, log }`.
- `ALL /auth/*` — better-auth ([05-auth.md](05-auth.md)).
- `POST /t/page`, `/t/link`, `/t/event` — beacons: plain Fastify (NOT tRPC; must accept `sendBeacon` `text/plain` bodies without preflight), 202 immediately, never 5xx, never block ([07-analytics.md](07-analytics.md)).
- `GET /internal/profiles/:username`, `GET /internal/domains/:host` (misses return a cacheable NONE — [02-architecture.md](02-architecture.md)), `POST /internal/previews/:token` (body `{passcode}` — draft ProfileContent for a live token + correct passcode; wrong passcode/invalid/expired/revoked → 404; `preview-verify` rate class; never cached — powers `/preview/[token]` SSR), `POST /internal/…` — HMAC-signed (`INTERNAL_API_SECRET`, timestamp ±5min) service endpoints for web's getStaticProps/middleware; aggressively Redis-cached (previews excepted).
- `POST /report` — public abuse report (landing `/report` form, [10-moderation.md](10-moderation.md)): unauthenticated, zod `{usernameOrUrl, reason, details?}`, `report` rate class, writes `AbuseReport`; response is always a neutral 202 (never reveals whether a username exists).
- `GET /healthz` (process up), `GET /readyz` (PG+CH+Redis ping).

## tRPC routers

Every procedure: zod input/output, auth middleware, **role check via `effectiveRole` + `can(role, action)`** for kyte-scoped calls (kyteId in input → org+kyte membership lookup → assert; [04-organizations.md](04-organizations.md)), **limit checks against the org's DB-stored limits** (over-limit → typed `LIMIT_REACHED` error the UI turns into the contact-Aleem modal), **capability gates** (analytics/assets procedures return typed `FEATURE_DISABLED` when their capability is off — [25-selfhost.md](25-selfhost.md)), the **suspension gate** (every mutating kyte-scoped procedure — draft edits, publish, schedules, uploads, previews, domains, username, even kyte delete — returns typed `KYTE_SUSPENDED` while the kyte is SUSPENDED/BANNED; read-only lockdown per [10-moderation.md](10-moderation.md), reversal is admin-only), a rate-limit class, and a cache annotation.

| Router | Procedures |
|---|---|
| `org` | `listMine` (orgs + kytes + effective roles, one round trip — powers the switcher), `create` (≤3 owned per user), `rename`, `delete` (OWNER, typed confirm, blocked while kytes exist), `auditLog(orgId|kyteId, filters)` (OWNER/ADMIN; MANAGER for kyte scope) |
| `kyte` | `get(kyteId)` (draft + published + my role + schedules + preview links), `create(orgId?)` (ADMIN+ in that org; creates/reuses the personal org when orgId omitted; limit-checked), `updateDraft({…, baseUpdatedAt})` (EDITOR+; returns a typed `STALE_DRAFT` conflict if the draft changed since `baseUpdatedAt` — powers the stale-save warning), `publish` (MANAGER+; increments `publishSeq` transactionally), `checkUsername`, `changeUsername` (MANAGER+), `delete` (OWNER + typed confirm), `transferOrg` (source org OWNER who is OWNER/ADMIN in the destination; destination kyte-limit checked; grant purge per [04-organizations.md](04-organizations.md)) |
| `presence` | `heartbeat(kyteId)` (10s TTL Redis key per member), `list(kyteId)` — powers "Sarah is editing" |
| `schedule` | `list(kyteId)`, `create` (MANAGER+; snapshots draft; ≤3 pending), `updateSnapshot`, `reschedule`, `cancel` (all MANAGER+) |
| `preview` | `list(kyteId)`, `create` (EDITOR+; ≤5 active; generates token + 6-digit passcode, runs the deterministic moderation checks — [04-organizations.md](04-organizations.md)), `revoke` |
| `import` | `fromUrl(kyteId, url)` — EDITOR+; detects Linktree/Beacons/Bio.link → deterministic parser; anything else → AI extraction via the moderation provider's OpenAI-compatible client (hidden without `OPENAI_API_KEY`; a named parser that breaks on changed markup falls back to the AI path when available). SSRF-guarded fetch (deny private ranges, 5s timeout, ≤2MB, redirect cap). Returns a zod-validated `{displayName?, description?, avatarUrl?, links[], icons[]}` **proposal** (≤50 links, URL policy applied) — the client shows it for user confirmation; nothing merges into the draft server-side; the avatar goes through the standard asset pipeline on confirm ([22-onboarding.md](22-onboarding.md)) |
| `team` | `members(orgId)`, `invite` (ADMIN+; payload + grantable-role rules per [04-organizations.md](04-organizations.md)), `revokeInvite`, `resendInvite` (1/24h), `updateAccess` (ADMIN+, below own role; last-owner guards), `removeMember` (one-click revoke; ADMIN+, below own role), `leave` |
| `invites` | `listMine` (by session email), `accept(token)` (checks the acceptor's 7-joined-orgs cap), `decline(token)` — strict email match |
| `account` | `get`, `changeEmail` (OTP-verify new address, invalidate sessions), `passkeys.list/rename/remove`, `deleteAccount` (blocked while last OWNER of any org with other members; else cascade + R2 purge + CH anonymize + revalidate) |
| `assets` | `createUploadUrl(kyteId, kind, contentType, sizeBytes)` (EDITOR+; checks the org 250MB storage limit), `finalize`, `delete` ([08-media.md](08-media.md)) |
| `analytics` | `overview`, `timeSeries({kyteId, days})`, `topLinks`, `referrers`, `devices`, `countries` — EDITOR+ (VIEWER is the no-analytics role); CH rollups; Redis 60s |
| `domains` | `list`, `add` (MANAGER+; DomainProvider), `status`, `remove` (MANAGER+) |
| `admin` | everything in [13-admin.md](13-admin.md) incl. `setOrgLimits`, all behind `adminProcedure` (session role + ADMIN_EMAILS double gate) |

Mutations that matter (publish, schedules, team, domains, username, transfers) write `AuditLog` in the same transaction via the shared `audit()` helper.

## Workers (BullMQ on Redis)

`moderation` ([10-moderation.md](10-moderation.md)) · `image-process` ([08-media.md](08-media.md)) · `og-image` (regenerate the profile OG card on publish, keyed by contentHash, deleting the previous card — [08-media.md](08-media.md), [16-seo.md](16-seo.md)) · `asset-quarantine` (prefix move `u/{kyteId}/` ↔ `q/{kyteId}/` on suspend/unsuspend — [08-media.md](08-media.md)) · `revalidate` (POSTs signed path lists to web; retries + dead-letter + admin alert) · `scheduled-publish` (30s DB sweep, row-locked, idempotent — [04-organizations.md](04-organizations.md)) · `sitemap` (nightly — [16-seo.md](16-seo.md)) · `cleanup` (orphaned assets, expired sessions/OTPs/invites/preview links). All idempotent with exponential backoff; dead-letter queues visible in admin.

## Rate limits

Redis token buckets `rl:{class}:{subject}`; fail-open for beacons, fail-closed for auth/uploads/invites; 429s carry `Retry-After`:

| Class | Subject | Start limit |
|---|---|---|
| beacon | ip_hash | 120/min |
| beacon-per-kyte | ip_hash+kyte_id | 30/min |
| otp-send / otp-verify | email·ip / email | 3/15min·10/hr / 5/15min |
| oauth | ip | 30/hr |
| trpc-read / trpc-write | user | 240/min / 60/min |
| username-check | user | 30/min |
| upload-url | user | 20/hr |
| invite-send | org · user | 10/day · 20/day |
| kyte-create | user | 5/day |
| preview-create | user | 20/day |
| preview-verify | ip | 10/15min |
| import | user | 10/day |
| username-change | user | 5/day |
| domain-add | user | 10/day |
| report | ip | 5/day |
| internal | HMAC only | — |

Rate limits are abuse brakes; the product ceilings (kytes/org, people/org, schedules, preview links, org storage) are the DB-stored limits from [04-organizations.md](04-organizations.md).

## Security checklist (the Phase-4 security critic verifies every line)

Authn + membership/role check on every kyte-scoped procedure — no client-supplied userId/role ever trusted; admin double-gated; HMAC + timestamp on internal routes; CORS locked to kytelink origins for `/trpc`; `/report` and `/t/event` explicitly allow the `kytelink.com` origin (the landing zone posts cross-origin to the API — `/report` sends JSON and WILL preflight); beacons stay preflight-free by design; cookies HttpOnly/Secure/Lax; CSRF on; OTPs and invite tokens stored hashed, single-use, attempt-capped, constant-time compared; invite accept requires verified-email match; last-owner guards on every member mutation; zod on every input incl. header-derived values; URL scheme allowlist (no `javascript:`/`data:`); SSRF guards in asset finalizer + migration downloader (deny private ranges, cap redirects); presigned PUTs size/type-capped; no secrets in `NEXT_PUBLIC_*`; dependency audit in CI; security headers + CSP on all Next apps.

## Observability & admin alerts

pino structured logs (request ids, per-route timing), optional `/metrics` Prometheus. `console.log` is a lint error. Success is never logged at error level.

- **Log shipping (founder-confirmed — no Sentry or error-tracking SaaS):** when the analytics capability is on, a pino transport batches every server log line into ClickHouse `app_logs` ([07-analytics.md](07-analytics.md)) — async, fail-silent, never blocking a request; capability off → stdout only.
- **Admin alerts (founder-confirmed — NEVER email, in-dashboard only):** one `adminAlert(kind, message, meta)` helper (named explicitly — never `alert`, which collides with the browser global) writes an `AdminAlert` row ([03-database.md](03-database.md)), surfaced solely in the admin app's Alerts view ([13-admin.md](13-admin.md)). Writers: revalidate dead-letter, moderation fail-open (`review_failed`), scheduled-publish FAILED, any worker dead-letter, seed anomalies. No email-sending code path for admin notifications exists anywhere.
