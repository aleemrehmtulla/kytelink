# Kytelink Rewrite — Plan (v3, living document set)

> **Start here.** This folder is the complete, authoritative plan for the ground-up rewrite of Kytelink. It is written for an AI **orchestrator** session (Claude Opus 4.8) that coordinates many parallel sub-agents. The orchestrator reads this README + [19-orchestration.md](19-orchestration.md) fully; every sub-agent receives **only the docs listed for its workstream** (reading lists in [19-orchestration.md](19-orchestration.md)) — that focus is deliberate, don't paste the whole folder into every agent.

## The goal

Rewrite Kytelink — an open-source Linktree alternative at `kytelink.com` with **~25,000 creator pages today (small user count, heavy per-page traffic)** — from a single slow SSR Next.js app into a fast, secure, self-hostable Turborepo platform built to scale to millions:

- **Fully static profile pages** revalidated only on publish (no SSR, no timed ISR).
- **ClickHouse analytics** (PostHog and Postgres-based hit tracking deleted).
- **Fastify + tRPC API** (no Next.js API routes save one documented revalidation hook — [11-web.md](11-web.md)), end-to-end type-safe.
- **Organizations/teams**: orgs own many Kytelinks; members get org-wide or per-kyte roles (5-level matrix), invites require acceptance, one-click revoke, snapshot-based scheduled publishes (up to 3), draft preview links, audit log, DB-stored limits. *(The biggest functional change — [04-organizations.md](04-organizations.md).)*
- **Publish-ASAP onboarding** + redesigned split-screen auth with passkeys ([22-onboarding.md](22-onboarding.md)).
- **Link imports**: onboarding + editor import from Linktree, Beacons, and Bio.link (deterministic parsers) or any URL via AI extraction ([22-onboarding.md](22-onboarding.md), [06-api.md](06-api.md)).
- **Growth measured**: the profile watermark links `kytelink.com/?ref={username}` and the admin funnel shows watermark-attributed signups ([07-analytics.md](07-analytics.md)); **3 new themes** ship alongside the pixel-frozen legacy 9 ([14-design.md](14-design.md)).
- **AI moderation** of every publish (phishing/NSFW) so signups can reopen.
- **R2-via-S3** user uploads + a local-CDN package for our own assets, Tailwind + shadcn UI + framer-motion, founder admin app with a real-time Live view.
- **Full marketing site**: redesigned home, six feature pages, use cases, and a real legal hub (Terms/Privacy — the PDF links die) with a proper footer ([12-landing.md](12-landing.md)).
- **Agent-first development**: seeded agent user + agent admin logins on a dedicated port set, so AI agents can boot, log in, and drive the product forever ([24-agents.md](24-agents.md)).

**Prime directive:** no data that affects how a profile displays or how a user logs in may be lost. The launch is a **seed, not a live migration** — the old stack is fully retired, ~15 min of full downtime is accepted, and the new stack comes up against an already-seeded database ([18-migration.md](18-migration.md)). A profile that renders differently after the seed is a failure.

**Quality bar:** zero known bugs at ship ([17-quality.md](17-quality.md)), fast and snappy everywhere ([15-performance.md](15-performance.md)), responsive and easy to use on all screens ([14-design.md](14-design.md)), everything self-hostable with no mandatory SaaS — including **graceful degradation**: only a database and Redis are required to boot; ClickHouse, S3, and every other integration are optional and switch their features off cleanly with a console warning ([25-selfhost.md](25-selfhost.md)).

**Simplicity mandate:** Kytelink's magic is "you just go make a Kytelink." All the new power (orgs, roles, schedules) is progressively disclosed — a solo user must never encounter a team/org concept ([04-organizations.md](04-organizations.md), first section).

## Where the code lives (founder-confirmed)

The new monorepo is built in **`v2/` inside this repo**. The legacy app at the repo root is a **read-only parity reference** — never modify it. All commands run from `v2/`. At launch, before the public GitHub push, the legacy files are deleted and `v2/`'s contents move to the repo root (a mechanical step in [18-migration.md](18-migration.md) — not the orchestrator's job).

## Target monorepo structure (rooted at `v2/` during development)

```
kytelink/
├── apps/
│   ├── web/        # Next.js PAGES ROUTER — kytelink.com: static profiles + editor + auth
│   ├── landing/    # Next.js PAGES ROUTER — marketing, served at kytelink.com/ via multi-zone rewrite
│   ├── admin/      # Next.js PAGES ROUTER — admin.kytelink.com, founder-only
│   └── api/        # Fastify + tRPC + better-auth + analytics beacons + BullMQ workers
├── packages/
│   ├── schemas/    # zod contracts + shared types (dependency-free; everything imports it)
│   ├── db/         # Prisma + Postgres (the only package touching Postgres)
│   ├── clickhouse/ # CH client, DDL, typed helpers
│   ├── trpc/       # router type exports + client factories
│   ├── ui/         # shadcn components, Tailwind preset, design tokens, ProfileView (THE renderer)
│   ├── cdn/        # OUR owned static assets + local CDN server + R2 sync on build (09-cdn.md)
│   ├── emails/     # email provider interface (resend|smtp|console) + React Email templates
│   └── config/     # tsconfig/eslint/prettier/tailwind presets
├── tools/seed/     # one-shot legacy seed old→new + verification suite
├── docker-compose.yml  # postgres + clickhouse + redis + minio + mailpit
└── .env.example
```

## Doc map

| Doc | Contents |
|---|---|
| [00-context.md](00-context.md) | What Kytelink is, why we're rewriting, the old system's failures |
| [01-parity.md](01-parity.md) | **Feature-parity contract** — every current behavior that must survive, exact data shapes |
| [02-architecture.md](02-architecture.md) | Monorepo rules, runtime topology, request flows, caching inventory, env-var contract |
| [03-database.md](03-database.md) | New Postgres schema (org-aware) + the `packages/schemas` contract |
| [04-organizations.md](04-organizations.md) | **Orgs, members & the 5-role matrix, invites, scheduled publishes, preview links, audit log, limits** |
| [05-auth.md](05-auth.md) | better-auth: Google + GitHub + email OTP w/ magic-link autofill + passkeys, Resend |
| [06-api.md](06-api.md) | Fastify app: tRPC routers, beacons, internal endpoints, workers, rate limits, security checklist |
| [07-analytics.md](07-analytics.md) | ClickHouse DDL, ingestion, rollups, product events |
| [08-media.md](08-media.md) | **User-uploaded** assets: R2 via S3 API, per-kyte keys, zero-CLS serving |
| [09-cdn.md](09-cdn.md) | **Our owned** assets: `packages/cdn` local CDN + build-time R2 sync |
| [10-moderation.md](10-moderation.md) | AI review pipeline: phishing/NSFW/sus-link policy, suspend flow |
| [11-web.md](11-web.md) | apps/web: SSG profiles, revalidation, middleware/zones, editor, onboarding |
| [12-landing.md](12-landing.md) | apps/landing: home redesign, feature pages, use cases, legal hub + footer (self-contained for the landing agent) |
| [13-admin.md](13-admin.md) | apps/admin: founder dashboards + moderation queue |
| [14-design.md](14-design.md) | Design system: font, tokens, responsiveness matrix, a11y, UX states |
| [15-performance.md](15-performance.md) | Speed budgets + the preload/prefetch plan |
| [16-seo.md](16-seo.md) | next-seo defaults, structured data, sitemaps |
| [17-quality.md](17-quality.md) | The "zero bugs" enforcement: test pyramid, defect policy, chaos bash |
| [18-migration.md](18-migration.md) | Legacy seed scripts, verification suite, launch runbook, rollback |
| [19-orchestration.md](19-orchestration.md) | **Orchestrator operating manual**: phases, workstreams + per-stream reading lists, agent brief templates, gates |
| [20-acceptance.md](20-acceptance.md) | Founder-facing acceptance criteria |
| [21-questions.md](21-questions.md) | Open questions awaiting founder answers (check before deciding yourself) |
| [22-onboarding.md](22-onboarding.md) | Auth screens (split layout, passkeys, login↔signup morph) + the publish-ASAP onboarding wizard |
| [23-conventions.md](23-conventions.md) | Code conventions: kebab-case files, folder structure, no comments — required reading for every agent |
| [24-agents.md](24-agents.md) | Agent mode: seeded agent logins, dedicated ports, dev-login — how AI agents drive the product |
| [25-selfhost.md](25-selfhost.md) | Self-hosting: README/`SELF-HOSTING.md`/`.env.example` specs + tiered env validation + the capability matrix |

## Conventions for this doc set

- These files are **iterated in place** — no wholesale rewrites. Change history lives in git.
- Cross-references are relative links. Each doc opens with a "read this if" line and lists its required companion docs; keep that accurate when editing.
- Decisions marked **[FOUNDER]** are open in [21-questions.md](21-questions.md) — the orchestrator must not resolve them unilaterally.
- The legacy codebase (this repo, pre-rewrite) is the reference for parity questions; [01-parity.md](01-parity.md) is its distilled contract.
