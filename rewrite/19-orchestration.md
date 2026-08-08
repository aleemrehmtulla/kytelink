# 19 — Orchestrator operating manual

*Read this if: you are the orchestrator. Read it fully, plus [README.md](README.md), before doing anything.*

You coordinate; sub-agents build; critic agents review; you arbitrate, integrate, verify, and gate. You write code yourself only for tiny glue — never a workstream.

**Where code lives (founder-confirmed):** the new monorepo is built at **`v2/` inside this repo**; the legacy app at the repo root is a read-only parity reference. All commands run from `v2/`; no agent ever modifies a legacy file. The move-to-root happens at launch ([18-migration.md](18-migration.md)) — not your job.

## Non-negotiable rules

1. **Contracts before code.** Nothing parallel starts until Phase 1's contracts are frozen. Post-freeze, contract changes go through you only: you edit the contract package, append to a `CONTRACTS.md` changelog, and notify affected streams. Two agents never negotiate directly.
2. **Exclusive file ownership** (matrix below). Agents read anything, write only inside their dirs. Post-freeze, `packages/*` belong to you.
3. **Focused context.** Each agent gets **only its reading list** (below) — paste the full text of those docs into the brief AND give the file paths. Do not paste the whole `rewrite/` folder into every agent; the split exists so the landing agent never sees ClickHouse DDL.
4. **Never trust "done".** Every report must include the exact commands run and their output. Spot-verify at least one claim per report yourself (run the test, curl the endpoint, load the page) before accepting. No runnable verification → sent back.
5. **Critique is mandatory and adversarial.** Every stream ends with fresh critics (never the author) holding the spec + a mandate to find real problems with `file:line` + a concrete failure scenario. Fix cycle until **two consecutive clean passes**.
6. **PROGRESS.md is your memory** (template below). Update after every gate. If your context is compacted, re-read README + this file + PROGRESS.md before acting.
7. **Batching:** independent agents launch in one parallel batch; never two writers in one dir; critics for different streams run as one batch.
8. **Founder input:** only for [21-questions.md](21-questions.md) items and destructive/irreversible decisions. Everything else: decide, record in PROGRESS.md, move.

## Operating loop (follow literally)

```
1. Read PROGRESS.md (create from template on first run).
2. Identify current phase + incomplete streams.
3. For each ready stream: compose its brief (template below) with the FULL text
   of its reading list pasted in.
4. Launch the batch. While agents run, pre-compose the next briefs/critic charters.
5. On completion: read report → spot-verify one claim → unverified or drifted?
   relaunch with specific corrections : proceed.
6. Launch the stream's critics. Triage: CONFIRMED → fix agent; REJECTED → record why.
   Repeat to two clean passes.
7. At phase boundary: run the gate checklist. All boxes or no exit.
8. Update PROGRESS.md. Goto 2.
```

## Phases

**Phase 0 — Scaffold** (1 builder + 1 critic). Turborepo + pnpm; all apps/packages stubbed and building; `packages/config` lint presets (strict TS, no-console, no-explicit-any); `packages/cdn` **working** (assets dirs, serve script, the sync implementation itself — [09-cdn.md](09-cdn.md) — and the one-time fetch of `assets/brand/aleem.png`); docker-compose (postgres16, clickhouse24, redis7, minio + bucket bootstrap + one-time cdn sync, mailpit); `.env.example` per [02-architecture.md](02-architecture.md); simple README + `SELF-HOSTING.md` + excellent `.env.example` per [25-selfhost.md](25-selfhost.md) + root `CLAUDE.md` per [24-agents.md](24-agents.md); `pnpm agents` script (port+1000 boot); CI (install/typecheck/lint/build/test). Gate: clean-clone `pnpm i && docker compose up -d && pnpm dev` boots all four apps + local CDN, and `pnpm agents` boots the agent-port set; CI green.

**Phase 1 — Contracts** (2 builders → 2-critic panel).
- C1: `packages/schemas` complete (port ICON_OPTIONS/themes/fonts/colors verbatim from the legacy repo's `consts/`; `effectiveRole` + `can` matrix; limits defaults; invite/schedule/audit shapes; the shared `landing-routes` const) + `packages/db` schema ([03-database.md](03-database.md)) + migrations + seed (20 kytes across several orgs covering every theme, emoji type, redirect, suspended, banned, long content, **an agency org with the stable id `org_agency_demo`, ALL + SELECTED members, pending invites, multiple scheduled publishes, preview links, audit history**).
- C2: `packages/clickhouse` (DDL + runner + typed helpers) + `packages/trpc` full router skeletons (zod I/O, TODO bodies — [06-api.md](06-api.md) table) + `packages/emails` interface + template shells + `packages/cdn` `getCdnUrl`/`getLqipUrl` + rate-limit classes as code + env schemas + **the frozen `packages/ui` public surface**: ProfileView's exact props (`{ content: ProfileContent; isPreview?: boolean; themeOverride?: ThemeKey; onLinkClick?: (link: Link) => void }`), the analytics chart components' prop shapes (**presentational, data-in-props** — the editor wraps them for fetching; landing feeds them mock data), the shared footer's nav-config shape, the `motion.ts` preset names, and the `DefaultSeo` config shape — so W6/W7 build against a stable component API while W5a implements it (W5a ships skeletons for ProfileView AND the analytics components early).
- Critics (parallel): **architecture critic** (contracts cover every [01-parity.md](01-parity.md) item + every spec doc? draft/published from one ProfileContent source? permission matrix single-sourced? zero `any`?) and **scale/security critic** (indexes vs hot queries, CH ORDER BY, rate-limit coverage, invite/OTP token handling, env completeness). Fix → **freeze** → record.

**Phase 2 — Parallel build.** Launch all nine after the freeze:

| Stream | Owns | Reading list (paste in full; 23 always included) | Builds |
|---|---|---|---|
| W1 API core | `apps/api` (minus dirs below) | 02, 03, 04, 05, 06, 16, 22, 23, 24, 25 | Fastify, tRPC wiring, better-auth (Google+GitHub+OTP+passkeys), sessions, **org/kyte/team/invites/schedule/preview routers + workers**, the link-import endpoint (deterministic parsers + AI path — [06-api.md](06-api.md)), limits enforcement, audit helper, rate limits, internal endpoints, Redis caching, pino, **agent mode** (fixed OTP + dev-login + agent-account seeding, [24](24-agents.md)). **Day-one deliverable: `pnpm mock-api`** — fixture server implementing the tRPC contract with seed data so W5a–W7 are never blocked |
| W2 Analytics | `apps/api/src/analytics`, `packages/clickhouse` impl | 02, 06, 07, 23 | beacons, enrichment, buffering, rollups, user+admin queries (incl. the real-time Live queries), product events |
| W3 Media | `apps/api/src/assets` | 02, 06, 08, 23 | presign, finalize, sharp pipeline (exported shared module), LQIP siblings, OG-image worker, storage accounting |
| W4 Moderation | `apps/api/src/moderation` | 02, 06, 10, 23 | queue, deterministic checks, provider interface + OpenAI impl, suspend flow |
| W5a UI & emails | `packages/ui`, `packages/emails` templates | 01, 02, 04, 08, 09, 11, 14, 15, 16, 23 | ProfileView ×12 themes (9 legacy pixel-frozen + the 3 new — [14](14-design.md)), design tokens + motion vocabulary, presentational analytics chart components, shared footer, DefaultSeo, **the finished React Email templates** (design per [14](14-design.md), inventory per [04](04-organizations.md)). **Ships ProfileView + chart skeletons day one** (unblocks W5b + W6) |
| W5b Web app | `apps/web` | 01, 02, 04, 05, 08, 09, 11, 14, 15, 16, 22, 23, 25 | SSG profiles + revalidate hook + middleware/zones, editor (org/kyte switcher, Team tab + role sheet, schedules panel, preview links + passcode gate, limit modal, **import flow**, suspended lockdown screen), upload UX (crop/zoom modal, real progress states, LQIP blur-up rendering — [08](08-media.md)), `/invites`, `/preview`, auth screens + onboarding wizard incl. platform imports ([22](22-onboarding.md)) |
| W6 Landing | `apps/landing`, `packages/cdn/assets` (landing + themes) | 09, 12, 14, 15, 16, 23, 25 | the full marketing site: home redesign, six feature pages, three use-case pages, legal hub + Terms + Privacy, shared footer (reads `packages/ui` + `packages/cdn`), incl. copying theme thumbnails + example avatars off third-party hosts into `packages/cdn/assets` |
| W7 Admin | `apps/admin` | 02, 04, 13, 14, 23, 25 | admin app incl. Live view, audit stream, limit editor — against `trpc.admin` types |
|  W8 Seed |  `tools/seed` | 01, 03, 04, 08, 18, 23 | backfill scripts + verification suite (imports W3's shared normalize module) + the **legacy fixture DB** (old schema + edge-case data) the scripts are proven against — the founder runs the real seed later, alone |

Cross-stream seams (you own these): W5a's `ProfileView` props are exactly `ProfileContent` (+ `isPreview`) from the frozen contracts — W6 builds the landing demo against that type from day one and swaps in the real component at integration (W5a ships a ProfileView skeleton early to unblock it); W8 imports W3's exported normalize module, never copies it; W5b–W7 run against W1's `pnpm mock-api` until real routers land; the beacon payload shape is frozen in contracts so W2 and W5b never negotiate.

Per-stream critics: W1/W4 security-leaning (+ W1 gets a dedicated **permissions critic**: try every role × action cell against the API); W2 correctness/perf (query results vs hand-computed fixtures); W5a/W5b/W6/W7 UX/parity (side-by-side vs [01-parity.md](01-parity.md)) + responsive sweep + a11y + the **simplicity check** (a solo user must never encounter a team/org concept — [04-organizations.md](04-organizations.md)); W8 paranoia (idempotency, resumability, read-only source, quarantine paths).

**Phase 3 — Integration** (you + 2–3 fix agents). Real local infra: seed → wire streams → full [17-quality.md](17-quality.md) E2E + visual baselines. Gate: E2E green **twice consecutively** from `docker compose down -v && up`.

**Phase 4 — Adversarial fleet** (one parallel batch → fix cycles): ① security critic ([06-api.md](06-api.md) checklist + attack mindset incl. IDOR-across-kytes, invite token replay, OTP brute force); ② performance critic (every [15-performance.md](15-performance.md) budget measured); ③ parity auditor ([01-parity.md](01-parity.md) line-by-line → PASS/FAIL/INTENTIONAL table); ④ DRY/quality critic (duplication, dead code, `any` leaks, single-owner caches, single-source matrix/ProfileContent); ⑤ self-host critic (fresh-VM README-only bring-up; unset optionals degrade silently); ⑥ scale reviewer ([15-performance.md](15-performance.md) watch items → concrete risks + mitigations); ⑦–⑨ chaos bash ([17-quality.md](17-quality.md)). Triage to zero (or founder-waived), re-run Phase 3 E2E.

**Phase 5 — Seed proving + launch package.** No prod access exists during the build (founder-confirmed: he runs the real seed himself, at the very end, after testing everything; the old site is simply down for ~15 minutes on launch day — no maintenance mode, no coexistence). W8's scripts are proven against its **legacy fixture DB** (old schema + generated edge-case data per [18-migration.md](18-migration.md)): full run → green verification report → visual-diff gallery from fixture profiles → quarantine/asset-failure handling demonstrated. Deliver those artifacts plus `LAUNCH-RUNBOOK.md` ([18-migration.md](18-migration.md) expanded: exact commands, owner per step, abort criteria, rollback) written so the founder can execute warm-up, seed, and DNS flip alone against the real old DB when he's ready. **You never execute against real data.**

## Agent brief templates (use verbatim, fill ⟨⟩)

**Build agent:**
```
You are building part of the Kytelink rewrite (monorepo at ⟨path⟩; plan docs in rewrite/).
MISSION: ⟨one sentence⟩.
YOU OWN (write ONLY here): ⟨dirs⟩. Read anything, including the legacy app at ⟨path⟩ (reference only — never modify).
SPEC (authoritative; full text of your reading list follows): ⟨paste docs⟩
CONTRACTS: import from packages/schemas + packages/trpc. Contract blocking you? STOP that thread and report — do not work around it.
DEFINITION OF DONE: ⟨checklist incl. tests to write and budgets to hit⟩
QUALITY: strict TS (no any/@ts-ignore), no console.log, NO code comments except truly non-obvious constraints (23-conventions.md — reviewers strike narration comments), kebab-case files per 23-conventions.md, all UX states per 14-design.md, motion per 14-design.md, responsive 360→1920, budgets per 15-performance.md, tests per 17-quality.md.
VERIFY BEFORE REPORTING: run ⟨commands⟩; exercise what you built end-to-end (curl/browser), not just typecheck.
REPORT FORMAT: (1) built what, file map; (2) how to run + verify — exact commands and output; (3) stubs/TODOs; (4) uncertainties/contract friction; (5) spec deviations with reasons.
```

**Critic agent:**
```
You are an adversarial reviewer for the Kytelink rewrite. You did NOT write this code.
SCOPE: ⟨dirs⟩, against this spec: ⟨paste docs⟩
CHARTER: ⟨focus + checklist section⟩
METHOD: read the code, then RUN it (⟨how⟩) and try to break it. Empirically verify ≥⟨N⟩ claims from the build report.
REPORT: ranked findings — file:line, concrete failure scenario ("input X → wrong Y"), severity (blocker/major/minor). A clean pass must state what you executed and observed; "looks fine" is invalid.
```

## Phase gate checklist

☐ All stream DoDs verified by you personally (spot-checks run) ☐ two consecutive clean critic passes per stream ☐ CI fully green ☐ no unowned files modified ☐ PROGRESS.md updated ☐ blocking founder questions answered or explicitly deferred.

## PROGRESS.md template

```md
# Progress
## Phase status
P0 scaffold ☐ · P1 contracts ☐ (frozen ☐) · P2 W1..W8 table · P3 ☐ · P4 ☐ · P5 ☐
## Decisions log      (date — decision — rationale — doc affected)
## Founder waivers
## Contract changelog (post-freeze only)
## Known risks / watch items
```

## Budget

~10–15 build agents + ~15–20 critic/chaos runs. If constrained: merge critics ④+⑤ — never fold streams into W5a/W5b (they are the critical path everything integrates against). Never cut: security critic, permissions critic, parity auditor, chaos bash, Phase 5.
