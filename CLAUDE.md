# CLAUDE.md

Kytelink is developed agent-first: AI agents boot the product, log in with
known credentials, and actually use it. If you're an agent landing in this
repo cold, you should be driving the product within a minute — read this
section first.

## Run the product as an agent

```bash
pnpm install
pnpm agents
```

That's the whole bootstrap: on a fresh clone `pnpm agents` runs the setup
wizard non-interactively (`pnpm run setup --all` — writes `.env` with fresh
secrets, starts the full Docker stack, migrates), then seeds the agent
accounts, then boots every app with `AGENT_MODE=true` on **dev port + 1000**,
so an agent session never collides with a human dev's `pnpm dev` session on
the same machine:

| App | Dev port | Agent port |
| --- | --- | --- |
| web (editor + public profile) | 3000 | **4000** |
| landing (kytelink.com marketing) | 3001 | **4001** |
| admin | 3002 | **4002** |
| api (Fastify + tRPC) | 3003 | **4003** |
| local CDN (shared, not shifted) | 5002 | 5002 |

**Logins** (OTP is always `000000` in agent mode, for any `*@kytelink.dev`
address):

- `agent@kytelink.dev` — personal org, one published `@agent` kyte, one
  unpublished draft, MANAGER in the seeded agency org (`org_agency_demo`).
- `agent-admin@kytelink.dev` — platform `ADMIN`, full admin app access.

Fast path for scripted flows: `POST {api}/auth/dev-login {"email":"..."}`
mints a real session and sets the signed cookie in one call — skips the
login screen entirely.

**One-line tour:** web editor on :4000, admin on :4002 — log in as
`agent@kytelink.dev`, OTP `000000`.

Both login mechanisms exist ONLY when `AGENT_MODE=true`, and `apps/api`
**refuses to boot** if `AGENT_MODE=true && NODE_ENV=production`. Full detail:
`git show faa5f4d^:rewrite/24-agents.md`.

## Design system — read before touching any UI

[`design/DESIGN-SYSTEM.md`](./design/DESIGN-SYSTEM.md) is **gospel** for all
visual work across landing, web, and admin. It distills the approved brand
prototype archived at `design/handoff/kytelink-redesign-prototype.html`. Do
not invent colors, radii, shadows, or typography — look them up there. Where
older design docs disagree with it, it wins.

## What Kytelink is

An open-source link-in-bio platform. This repo is a ground-up rewrite (v2)
that replaced the original codebase at the cutover commit `faa5f4d`
("kytelink v2!", PR #25). The v1 code and the `rewrite/` design docs behind
the rewrite live only in git history now — `git show faa5f4d^:rewrite/README.md`
and `git show faa5f4d^:rewrite/00-context.md` are the best starting points
for *why* the rewrite exists and how it's organized.

## Repo layout

```
apps/web       Next (Pages Router) :3000 — editor + public profile pages
apps/landing   Next (Pages Router) :3001 — kytelink.com marketing zone
apps/admin     Next (Pages Router) :3002 — admin.kytelink.com
apps/api       Fastify + tRPC :3003 — /trpc/*, /auth/*, /t/* (beacons), /internal/*

packages/schemas    zod-only, dependency-free — single source of truth for domain types
packages/db         Prisma client — NEVER imported by apps/web (profile data flows through the API)
packages/clickhouse  analytics client — off gracefully when CLICKHOUSE_URL is unset
packages/trpc       the app tRPC router, shared by apps/api and app clients
packages/ui         ProfileView lives here ONCE — public profile, editor preview, landing demo all mount it
packages/cdn        owned static assets + getCdnUrl/getLqipUrl + the S3 sync script
packages/emails     react-email templates
packages/config      shared tsconfig/eslint/prettier/tailwind presets — every app/package consumes these

tools/seed     seeds the local Postgres (base fixtures always; agent accounts when AGENT_MODE=true)
deploy         Caddyfile for the self-hosting edge (COMPOSE_PROFILES=...,proxy) — terminates
               TLS and issues certs on demand for users' custom domains
```

Runtime topology, caching ownership, and the full environment contract are
documented in the `02-architecture.md` design doc
(`git show faa5f4d^:rewrite/02-architecture.md`) — read it before touching
boot/env code.

## Conventions (full list: `git show faa5f4d^:rewrite/23-conventions.md`)

- Lowercase kebab-case for every file and folder. No PascalCase filenames.
- Named exports over default exports, except Next `pages/*` files (Next
  requires the default export there).
- Strict TypeScript everywhere. `any`, `@ts-ignore`, and `console.log` are
  lint errors (enforced by `packages/config`'s eslint preset).
- No comments except genuinely non-obvious constraints — no section
  banners, no narration, no commented-out code, no TODO litter.
- `apps/web` never imports `packages/db` directly (enforced by
  `apps/web/eslint.config.js`) — profile data flows through the API.
- Buttons: a loading button is a bare spinner at the *same width* as its
  resting state — never swap the label ("Save" never becomes "Saving…"), and
  disabled buttons never change color on hover (gate hovers behind
  `not-disabled:`, never `enabled:`). Use the shared `Button` rather than a
  raw `<button>`; both rules are standing user rules and the full technique is
  in `design/DESIGN-SYSTEM.md` §7.

## Everyday commands

```bash
pnpm run setup       # one-shot first-run wizard: .env + docker + migrate + seed
pnpm dev            # web:3000 landing:3001 admin:3002 api:3003 cdn:5002
pnpm agents          # same apps on port+1000, AGENT_MODE=true, prints logins
pnpm -w typecheck    # strict TS, zero errors
pnpm -w lint         # eslint, strict presets
pnpm -w build        # all apps + packages
pnpm -w test         # vitest across every package
pnpm --filter @kytelink/cdn sync   # push packages/cdn/assets to the S3 bucket
                                   # (prunes static/* objects deleted locally)
```

## Database migrations

```bash
pnpm db:migrate "add-thing"   # edit packages/db/prisma/schema.prisma first;
                              # creates + applies a migration on the local DB
pnpm db:deploy                # apply committed migrations locally (after a pull)
pnpm db:status                # local migration status
pnpm db:status:prod           # prod status — reads DATABASE_URL from .env.PROD
pnpm db:deploy:prod           # apply pending migrations to PROD; prints the
                              # target + status, then requires typing "deploy"
```

Migrations are written additive-first (new columns carry defaults, new
tables), so migrating prod and deploying code work in either order — run
`db:deploy:prod` whenever it suits the release. `.env.PROD` is a gitignored
file at the repo root that exists only for run-from-your-machine commands
like these: the deployed apps never read it (their env comes from the
host), and its `DATABASE_URL` must be the externally-reachable connection
string — a provider's internal hostname only resolves inside its network.
`migrate dev` is blocked against prod by `db.mjs`; only `migrate deploy`
(applies committed migrations in order, never destructive) touches it.
Note `pnpm migrate:prod` is unrelated — that's the founder-only one-time
v1→v2 data migration.

Docker services are grouped into compose profiles (`core` = Postgres+Redis,
`analytics` = ClickHouse, `uploads` = MinIO + bucket/CDN bootstrap, `email` =
mailpit). The `COMPOSE_PROFILES` line in `.env` (written by `pnpm run setup`)
selects which ones a plain `docker compose up -d` starts; `pnpm dev` and
`pnpm agents` bring them up automatically. Note `pnpm run setup`, not
`pnpm setup` — the latter is pnpm's own built-in command.

Seeding: `pnpm --filter @kytelink/seed seed` is the idempotent sample-data
seed (what setup and `pnpm agents` run). It refuses to run against a non-local
database — it writes demo orgs and `*.demo` users that must never reach
production. The founder-only one-time v1→v2 production migration is
`pnpm migrate:prod` (reads `v2/.env.PROD`, documented in `LAUNCH-RUNBOOK.md`);
never run it during setup, and it is slated for removal after launch.

## Reading the API log

apps/api prints one line per request, columns first: clock, level mark,
subsystem tag, then `METHOD status duration target  who  why`.

```
13:56:05  auth      POST 200    56ms  dev-login
13:56:05  trpc      POST 200    12ms  kyte.list             agent@kytelink.dev
13:56:05 !trpc      POST 400     6ms  kyte.create           agent@kytelink.dev  BAD_REQUEST  username: expected string
13:56:05 !analytics dropped an event beacon — its body failed validation
```

Batched tRPC calls list their procedures (`kyte.list, account.me +2`), the
signed-in email is on the line, and a rejected procedure carries its tRPC
code plus the first failing field. `/health` and `/readyz` only appear at
`LOG_LEVEL=debug`. The `auth` tag is where the local login code and its
one-click verify URL print. Everything becomes JSON under
`NODE_ENV=production` (or `LOG_FORMAT=json`), with the tag as a field.

## Self-hosting

If you're setting up a real deployment rather than local dev, start at
[`SELF-HOSTING.md`](./SELF-HOSTING.md) — it owns the env var reference and
the capability matrix (what turns off gracefully when an optional service
like ClickHouse or S3 is missing).
