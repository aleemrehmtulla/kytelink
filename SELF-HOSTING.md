# Self-hosting Kytelink

## 1. The promise

Kytelink is open source, ground up. Zero parts of the app are closed, and
we use no third party that lacks an open-source or self-hostable
equivalent:

| Founder's hosted stack | Self-hosted equivalent |
| --- | --- |
| Cloudflare R2 | MinIO, or any S3-compatible bucket |
| Resend | SMTP (any provider, or your own Postfix) |
| ClickHouse Cloud | ClickHouse OSS (a VM, or the docker-compose service) |
| Neon (Postgres) | Plain Postgres (compose, RDS, your own box) |
| OpenAI | Any OpenAI-compatible endpoint, including local models |
| Vercel domain automation | Caddy on-demand TLS (`deploy/Caddyfile`) |

The founder's hosted config (Vercel + Render + Neon + ClickHouse Cloud) is
**one example configuration**, not a requirement. Every piece of that stack
has a drop-in open-source or manual replacement, and the app code never
assumes a specific provider — it only speaks standard protocols: Postgres
wire protocol, the Redis protocol, the S3 API, SMTP, and OpenAI's HTTP API
shape.

## 2. Fastest path (5 minutes)

```bash
git clone https://github.com/aleemrehmtulla/kytelink.git && cd kytelink
pnpm install
pnpm run setup                # interactive one-shot wizard — see below
pnpm dev
```

`pnpm run setup` does everything a first boot needs, and asks before enabling
anything optional:

1. **Postgres + Redis** — the only hard requirement. The wizard runs both in
   Docker for you, or you paste connection strings to services you manage.
   The server refuses to start without them; there is no degraded mode for
   the database.
2. **Analytics (ClickHouse)? Uploads (MinIO)? Local email inbox (mailpit)?**
   — each is a y/n question. Skipping one just turns that capability off
   gracefully (see the matrix below); you can re-run the wizard or edit
   `.env` later to change your mind.
3. It then writes `.env` with **freshly generated secrets**, starts the
   chosen Docker services, waits for them to be healthy, applies Postgres
   (and, if enabled, ClickHouse) migrations, and seeds sample data.

Non-interactive flavors: `pnpm run setup --all` (everything on, used by CI
and agents) and `pnpm run setup --minimal` (database layer only). Add
`--no-seed` to skip sample data.

Then `pnpm dev` — `web` on :3000, `landing` on :3001, `admin` on :3002,
`api` on :3003, the local static-asset CDN on :5002. `pnpm dev` also
self-heals: it re-starts your chosen Docker services if they're down and
applies any pending migrations before booting the apps, and if `.env` is
missing or incomplete it stops immediately with the exact command to run.

**How the service selection sticks:** the wizard writes a `COMPOSE_PROFILES`
line into `.env` (e.g. `core,analytics,uploads,email`). Docker Compose reads
it natively, so a plain `docker compose up -d` forever after starts exactly
the services you chose during setup — one mechanism, no extra flags.

### Seeding — know the two seeds

- **`pnpm --filter @kytelink/seed seed`** — the standard sample-data seed
  (demo kytes and orgs). Idempotent upserts; safe to run any number of
  times. This is what `pnpm run setup` runs, and the only seed a
  self-hoster ever needs.
- **`pnpm migrate:prod`** — the one-time legacy backfill that migrated the
  founder's v1 production database into this schema. It is **not** part of
  setup, is never needed for self-hosting, and will be removed from the
  repo after launch.

## 3. Per-service setup

### Postgres (required)

The primary datastore: users, kytes, memberships, invites, assets, domains,
moderation, schedules. Any Postgres 16+ works — connection string is all we
need.

```yaml
# docker-compose.yml (already included)
postgres:
  image: postgres:16
  environment:
    POSTGRES_USER: kyte
    POSTGRES_PASSWORD: kyte
    POSTGRES_DB: kyte
  ports: ["5432:5432"]
```

Fills: `DATABASE_URL`, `DIRECT_URL` (same value unless you're behind a
pooler like PgBouncer/Neon, in which case `DIRECT_URL` must point at the
unpooled endpoint for migrations). Compose profile: `core`.

### Redis (required)

Caches, rate limits, BullMQ queues, the beacon buffer. Any Redis 7+
(or a Redis-protocol-compatible store) works.

```yaml
redis:
  image: redis:7
  ports: ["6379:6379"]
```

Fills: `REDIS_URL`. Compose profile: `core`.

**One instance is enough** — the app opens a single `REDIS_URL` and shares it
across every use. Do not run a separate cache Redis; the queues and the cache
must agree on the settings below, and splitting them buys nothing at this
scale.

If your provider asks how to configure the instance:

| Setting | Value | Why |
| --- | --- | --- |
| Maxmemory policy | **`noeviction`** | BullMQ requires it. Job payloads, the wait/active lists, job locks and the repeatable-job schedulers are durable state with no TTL — an eviction silently drops queued work or lets a locked job double-run. `allkeys-lru` would treat them as cache. |
| Persistence | **journal + snapshot** (AOF + RDB) | Queues are the only copy of in-flight work (OG-image renders, asset quarantine moves, moderation, ISR revalidation). A restart without persistence loses them. |

`noeviction` means Redis returns write errors instead of dropping keys when
memory fills, so size the instance with headroom and alert on memory. Every
non-queue key the app writes carries an explicit TTL (profile/domain cache,
rate-limit counters, beacon dedupe sets), so steady-state memory is bounded
by traffic, not by uptime — a small instance (≥256 MB) is plenty to start.

### ClickHouse (optional — analytics)

Backs page/link/product analytics and their rollups. Skip it entirely and
the app runs fine with analytics off.

```yaml
clickhouse:
  image: clickhouse/clickhouse-server:24
  environment:
    CLICKHOUSE_DB: kyte
    CLICKHOUSE_USER: default
    CLICKHOUSE_PASSWORD: kyte
  ports: ["8123:8123"]
```

Fills: `CLICKHOUSE_URL`, `CLICKHOUSE_PASSWORD`. Compose profile:
`analytics` — the wizard's "Enable analytics?" question.

### S3 storage (optional — uploads)

Owned static assets (`packages/cdn`) AND user uploads share one bucket,
under different prefixes (`static/` vs `u/{kyteId}/`). Any S3 API works:
MinIO locally, Cloudflare R2, or plain AWS S3.

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  ports: ["9000:9000", "9001:9001"]
```

The compose stack also runs a one-shot bootstrap that creates the bucket
and syncs `packages/cdn/assets/` into it, so owned assets (logos, theme
thumbnails, etc.) are present from the first `docker compose up -d`.

Fills: `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION`, `AWS_S3_BUCKET`, and the public `NEXT_PUBLIC_CDN_URL`.
Compose profile: `uploads` — the wizard's "Enable image uploads?" question.

### Email (optional — defaults to smtp/mailpit in the local stack)

Three backends, chosen by `EMAIL_PROVIDER`:

- **console** — OTPs and invite links print to server stdout *only*.
  `mailpit` is an SMTP inbox — it never receives anything sent in console
  mode, so console-mode codes do **not** show up at http://localhost:8025.
  Use this if you'd rather just read codes from the terminal.
- **smtp** (`.env.example` default) — point at any SMTP server. Locally
  that's `mailpit` (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, no auth
  needed), so OTPs/invites actually appear at http://localhost:8025; in
  production point it at Postfix or another real SMTP provider.
- **resend** — use the Resend API directly.

```yaml
mailpit:
  image: axllent/mailpit:latest
  ports: ["8025:8025", "1025:1025"]
```

Fills: `EMAIL_PROVIDER`, `EMAIL_FROM`, plus either `SMTP_HOST`/`SMTP_PORT`/
`SMTP_USER`/`SMTP_PASSWORD` or `RESEND_API_KEY` depending on the backend.
Compose profile: `email` — the wizard's "local email inbox" question
(answering no falls back to console mode).

### Moderation + AI import (optional — defaults to off)

`MODERATION_PROVIDER=none` (default) auto-approves every publish and hides
the moderation UI entirely. **This now means no automated suspensions at
all.** Nothing suspends a page except a model verdict — the pattern checks
(IP-logger blocklist, brand-lookalike domains) only flag a page for review,
they never suspend one themselves — so on an instance with no provider
configured, even a known phishing link publishes and stays up until a human
suspends it from the admin app. Run with a provider if your instance is open
to the public. Set it to `openai` and point `OPENAI_API_KEY`
(+ optionally `OPENAI_BASE_URL` for any OpenAI-compatible endpoint,
including self-hosted models) to turn on moderation and the AI "Other"
link importer. Linktree/Beacons/Bio.link imports use deterministic parsers
and work either way.

Fills: `MODERATION_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`,
`MODERATION_MODEL`.

Review runs on two tiers. `MODERATION_MODEL` (default `gpt-5-mini`) handles
routine reviews; `MODERATION_ESCALATION_MODEL` (default `gpt-5`) handles the
calls worth paying for — a page presenting itself as a big company's support
desk, where the model decides whether that company is genuinely here, and any
suspend the smaller model returned below the confidence threshold. Escalation
only fires on those cases, and the model used is on every review log line.

`MODERATION_SUSPEND_MIN_CONFIDENCE` (default `0.8`, range 0–1) is how sure the
model has to be before a SUSPEND verdict is actually applied. Below it the
review is still written with all of its signals, but the page stays up — manual
reports are the backstop. Deterministic phishing hits (brand lookalike domains,
IP-grabber links, a brand-support impersonation pointing off-brand) suspend
regardless of this setting.

### Ahrefs web analytics (optional — defaults to off)

Third-party page analytics, separate from Kytelink's own ClickHouse
analytics: set `NEXT_PUBLIC_AHREFS_KEY` to your [Ahrefs Web
Analytics](https://ahrefs.com/web-analytics) data key and every page of the
web, landing and admin apps renders the Ahrefs tracking tag. Leave it blank
(the default) and no third-party script loads at all. Like every
`NEXT_PUBLIC_` var it is inlined at build time, so it must be present when
the Next apps are *built*, not just when they run.

Fills: `NEXT_PUBLIC_AHREFS_KEY`.

### Custom domains (optional)

Letting your users put their kyte on their own domain needs two things: your
edge has to **accept** traffic for a hostname you don't own, and it has to
present a **valid certificate** for it. DNS pointing at you is necessary but
never sufficient — without a certificate the browser fails before your app is
reached. `DOMAIN_PROVIDER` picks how both are handled.

#### `proxy` (default — self-hosting)

Your reverse proxy terminates TLS and issues certificates on demand, asking the
API whether a hostname is allowed before issuing. A shipped Caddy config does
this in about ten lines:

```bash
COMPOSE_PROFILES=core,analytics,uploads,email,proxy docker compose up -d
```

[`deploy/Caddyfile`](./deploy/Caddyfile) terminates TLS for your own hostnames
and, for anything else, calls `GET /internal/domains/allowed?domain=<host>`
before asking Let's Encrypt for a certificate. That gate is what stops a
stranger pointing a domain at your server and burning through ACME rate limits,
so **do not expose that endpoint publicly** — it is meant for your proxy only.

Set `CUSTOM_DOMAIN_A_RECORD` to your edge's public IP and
`CUSTOM_DOMAIN_CNAME_TARGET` to a hostname resolving to it. These are what users
are told to create *and* what verification checks, so they must be right: leave
them unset and the custom-domain UI reports itself unconfigured rather than
handing out records that lead nowhere.

Any proxy with on-demand TLS works — Traefik and nginx + a small ACME helper do
the same job. All Kytelink needs is that your proxy consult the `allowed`
endpoint before issuing.

#### `vercel` (hosted on Vercel)

**If you deploy on Vercel you must set `DOMAIN_PROVIDER=vercel`.** It is not the
default. Vercel 404s any Host header not registered on the project, so DNS alone
can never activate a domain there — the API call is mandatory. Running the proxy
provider while telling users to point at Vercel's IP is the one configuration
that fails silently: the DNS check passes, the domain is marked verified, and it
still 404s. The API logs a boot warning if it detects that combination. Adding a domain
registers it on your project, which makes the edge accept it and provision its
certificate; an apex domain registers `www.` alongside it. Needs `VERCEL_TOKEN`
(project domain read/write), `VERCEL_TEAM`, and `VERCEL_PROJECT`.
`CUSTOM_DOMAIN_*` default to Vercel's published targets and only need setting to
override them.

#### Verification and the 48-hour grace window

A domain only serves once it is verified. Three things do that checking: the
editor re-checks every few seconds while its tab is open (and on a **Refresh**
button), a sweep re-checks every *unverified* domain every ten minutes, and a
full sweep re-checks *every* domain every six hours.

The ten-minute sweep is what makes "set your DNS and walk away" work — DNS
propagation usually finishes long after the user has closed the tab, and without
it a correctly-pointed domain would sit dark until the next full sweep. The
six-hourly one is what notices a domain that quietly breaks, so it stops serving
instead of sending visitors into a dead end.

A domain that stays disconnected for **48 hours** is released — removed from the
provider and deleted from the user's kyte. The clock runs from the last time the
domain was confirmed connected, falling back to when it was added, so it covers
both "added but never pointed at us" and "worked for months, then lapsed". This
is why the sweep exists: on a hosted plan an unused domain still occupies a slot
you pay for.

Only a definitive "this DNS does not point here" counts against that window.
If the provider errors, the check times out, or the instance has no domain
capability configured, the sweep records the result as inconclusive and changes
nothing — an expired API token or a missing `CUSTOM_DOMAIN_*` must never be read
as "every domain is disconnected".

Fills: `DOMAIN_PROVIDER`, `CUSTOM_DOMAIN_A_RECORD`, `CUSTOM_DOMAIN_CNAME_TARGET`,
`VERCEL_TOKEN`, `VERCEL_TEAM`, `VERCEL_PROJECT`, and (proxy profile) `ACME_EMAIL`,
`WEB_HOSTNAME`, `LANDING_HOSTNAME`, `ADMIN_HOSTNAME`, `API_HOSTNAME`.

## 4. The capability matrix

| Missing | Capability off | What the user sees |
| --- | --- | --- |
| `CLICKHOUSE_URL` | **analytics** | Beacon endpoints return 202 and drop; the editor has no Analytics tab; admin Live/Traffic views show a friendly "Analytics is off — set CLICKHOUSE_URL" card; server logs stay on stdout (no `app_logs`). Everything else works. |
| `AWS_*` (S3) | **uploads** (the whole image concept) | Upload tiles hidden; onboarding's avatar step offers only the built-in default avatars (locally generated initials SVGs — no third party); profiles render clean without avatars; OG cards fall back to text-only; owned/static assets still work (serve `packages/cdn` locally and point `NEXT_PUBLIC_CDN_URL` at it). |
| `RESEND_API_KEY`/SMTP | **emailDelivery** → console | OTPs and invites print to server stdout only — mailpit does NOT capture console-mode output (it's an SMTP inbox, not a log tail). To see codes in mailpit, set `EMAIL_PROVIDER=smtp` with `SMTP_HOST=localhost`/`SMTP_PORT=1025` (the `.env.example` default already does this against the compose stack). Either way everything still functions — you just read codes from stdout instead. |
| `OPENAI_API_KEY` | **moderation** → none | Publishes auto-approve; the feature is invisible. The AI "Other" link import is hidden too; Linktree/Beacons/Bio.link imports still work (deterministic parsers). |
| `GOOGLE_*` / `GITHUB_*` | that OAuth button | Hidden from the auth screen; email OTP always works. |
| `NEXT_PUBLIC_AHREFS_KEY` | **Ahrefs tag** | No third-party analytics script renders anywhere — pages simply ship without it. Kytelink's own ClickHouse analytics are unaffected either way. |
| `CUSTOM_DOMAIN_*` (proxy mode) or `VERCEL_*` (vercel mode) | **domains** | The custom-domain UI explains that custom domains are not configured on this instance. Everything else works; `kytelink.com/username`-style URLs are unaffected. |

A disabled capability always means the UI surface is absent or replaced
with one calm explanatory card — never a broken button or error toast. Its
tRPC procedures return a typed `FEATURE_DISABLED` error as the backstop,
and product events for disabled features simply don't fire.

## 5. Production notes

- **Schema migrations.** `pnpm db:deploy:prod` applies pending Prisma
  migrations to your production Postgres from your own machine. It reads
  `DATABASE_URL` from `.env.PROD` — a gitignored file at the repo root that
  exists only for run-from-your-machine commands like this one. The deployed
  apps never read it; their env comes from your host's configuration. Put
  your database's **externally-reachable** connection string in it — a
  provider's internal hostname (Render, Neon poolers, etc.) only resolves
  inside its own network. The command shows the target database and
  pending-migration status, asks for confirmation (`--yes` for CI,
  `--env <path>` for a different file), and only ever runs `prisma migrate
  deploy` — committed migrations in order, never a reset. Migrations are
  written additive-first (new columns carry defaults), so migrating before
  or after you deploy the code both work.
- **Logs.** apps/api prints one aligned, colorized line per request in dev
  and newline-delimited JSON in production (`NODE_ENV=production`). Every
  line carries a `tag` naming the subsystem (`boot`, `auth`, `trpc`, `http`,
  `domains`, `analytics`, `workers`, …), so `jq 'select(.tag=="domains")'`
  is the shipping-friendly filter. Two knobs: `LOG_LEVEL` (default `info` —
  `debug` adds capability-skip and cache-hit lines) and `LOG_FORMAT=json`,
  which forces the production format in dev when you want to test a
  log pipeline locally.
- **ISR cache volume.** apps/web's Next.js ISR cache should live on a
  persistent volume in production (not ephemeral container storage), or
  page revalidation resets on every deploy.
- **Run workers separately.** Set `PROCESS_ROLE=worker` on a dedicated
  process/container for the BullMQ workers (moderation, image-process,
  og-image, revalidate, scheduled-publish, sitemap, cleanup) — don't run
  them inline in the same process serving HTTP traffic.
- **Backups.**
  - **Postgres is the can't-lose store.** Use `pg_dump` on a schedule, or
    point-in-time recovery if your provider offers it (the founder's
    hosted stack relies on Neon PITR).
  - **The S3 bucket holds irreplaceable user uploads.** Periodic sync or
    cross-region replication is recommended.
  - **ClickHouse loss is accepted as lossy.** Analytics data is valuable
    but not critical — losing it doesn't lose user data, so it's not part
    of the backup-critical path.

## Also see

- [`README.md`](./README.md) — quickstart.
- [`CLAUDE.md`](./CLAUDE.md) — agent-mode port table, logins, and repo tour
  for coding agents (human contributors can read it too).
