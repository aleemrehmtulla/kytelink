# tools/e2e — Phase 3 clean-boot gate

The consolidated clean-boot E2E harness for the Kytelink rewrite. Drives the
**real** integrated stack (real API + web/landing/admin on real docker infra),
not a mock.

## The gate command

```bash
pnpm --filter @kytelink/e2e gate        # full clean boot: down -v -> ... -> teardown
```

What it does (idempotent; runnable twice back-to-back):

1. `docker compose down -v && docker compose up -d`, wait all services healthy
2. `prisma migrate deploy` + `clickhouse migrate`
3. seed (base fixtures + agent accounts, `AGENT_MODE=true`)
4. **integration** suite — `apps/api` vitest (docker-backed, 159 tests)
5. build web/landing/admin (production) + boot the agent stack on ports 4000/4001/4002/4003 (+cdn 5003)
6. **E2E** golden path — Playwright, 375px + 1440px
7. **visual regression** — ProfileView baselines
8. teardown (apps + `docker compose down -v`)

Flags: `--keep-infra` (skip docker reset), `--no-teardown` (leave stack up),
`--reuse-apps` (drive an already-running stack), `--skip-integration`, `--skip-e2e`.

```bash
pnpm --filter @kytelink/e2e degraded    # degraded-mode boot verifier
pnpm --filter @kytelink/e2e test:visual:update   # regenerate visual baselines
```

## Why the apps are served in production mode (`next start`), not `next dev`

The gate builds web/landing/admin and serves them with `next start`. Two real
reasons `next dev` is unusable for this harness on macOS:

- **EMFILE**: three concurrent `next dev` file-watchers exhaust the OS file
  descriptors; servers become unresponsive.
- **Dropped server env**: `next dev` render workers do not inherit non-`NEXT_PUBLIC`
  env from the parent, so `getStaticProps` signs internal API calls with an empty
  `INTERNAL_API_SECRET` → 401 → every profile 404s. (This also affects the
  documented `pnpm agents` dev boot — see "Findings" in the run report.)

The gate writes ephemeral `apps/<app>/.env.local` files (gitignored) so the
built server process has the server-only secret, and removes them on teardown.

## Golden-path coverage (17-quality §9)

Specs live in `specs/`. `support/` holds the fixtures: `devLogin` (real
better-auth session via `/auth/dev-login`), a mailpit OTP reader, a ClickHouse
HTTP client, and a fresh-user onboarding helper.

| Step | Status | Spec |
|---|---|---|
| OTP signin (type-it + magic-link, fixed 000000 real code path) | REAL | 02-auth |
| OAuth Google/GitHub | SUBSTITUTED — `AUTH_MOCK_PROVIDERS` wired in gate env; not driven headlessly | — |
| Passkey login (virtual authenticator) | NOT COVERED — see notes | — |
| Onboarding to a LIVE page in one sitting | REAL | 03-onboarding-to-live |
| Static profile correct after publish | REAL | 03, 01 |
| Public profile / SEO / watermark / 404 / redirect / suspended (kyte + org scope) | REAL | 01-public-profile |
| Beacon lands in ClickHouse (+ server-side kyteId resolution vs spoof) | REAL | 04-beacon-analytics |
| Analytics render | BLOCKED by product bug (414) — `test.fail()` | 04-beacon-analytics |
| Kyte switcher (solo flat / "New Kytelink") | REAL | 05-editor-switcher-limits |
| Limit modal (preview-link cap → contact-Aleem) | REAL | 05 |
| Suspended kyte read-only lockdown (public shell) | REAL | 05, 01 |
| Preview link passcode gate: create → wrong → right → revoke | REAL | 06-preview-passcode |
| Admin Live view + moderation queues + non-admin blocked | REAL | 07-admin |
| Sitemap + robots from the web zone (fallback sitemap, shard URL, robots reference) | REAL | 08-sitemap |

Not driven headlessly in this pass (documented substitutions):

- **Passkey virtual authenticator**: infra is server-wired; a WebAuthn CDP
  virtual-authenticator spec is a follow-up. Auth is otherwise proven real via OTP.
- **OAuth mock click-through**, avatar crop/upload progress, custom-domain
  Host-header rewrite, teammate invite accept from a 2nd account, EDITOR
  publish-block E2E, two-schedule fire order, Linktree import
  confirm, full moderation auto-suspend<60s + CDN 404 + admin approve restore:
  the authz/limits/suspension/preview/import halves are covered by the
  **integration** matrix (apps/api, 159 tests); the remaining UI click-throughs
  are the next E2E increment.

## Visual regression

`specs/visual/profile-view.visual.spec.ts` + committed baselines under
`specs/visual/__screenshots__/`. Real seeded profiles: 10 ProfileView variants
(8 short-content theme rows + all-link-kinds + long-all-emoji-types) plus 2
suspended shells (kyte-scoped, org-scoped), each × {mobile 375, desktop 1440} = 24
baselines. Regenerate intentionally with `test:visual:update`.

## Degraded-mode boots

`degraded.mjs` boots the API under reduced envs and asserts the tiered behavior
(`/readyz` checks + `computeCapabilities`): full-infra, no-CLICKHOUSE_URL
(analytics off, still green), no-AWS_* (uploads off), minimal-env (only the 7
required vars; analytics + uploads + email all cleanly off).
