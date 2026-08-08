# 24 — Agent mode: AI agents use the product like users

*Read this if: you're building the API, the scaffold, or the E2E harness. This is a first-class feature of the dev environment, not a test hack.*

**The point:** Kytelink is developed agent-first. AI agents (Claude and friends) must be able to boot the product, log in with known credentials, and actually use it — browse profiles, drive the editor, check the admin app — so agents can continuously review, test, and improve the site forever after launch. Zero friction: one command, fixed ports, fixed logins.

## One command, dedicated ports

`pnpm agents` at the repo root: boots docker-compose (if not up) and starts every app with `AGENT_MODE=true` on **agent ports = normal dev port + 1000**, so an agent's session never collides with a human dev's:

| App | Dev port | Agent port |
|---|---|---|
| web | 3000 | **4000** |
| landing | 3001 | **4001** |
| admin | 3002 | **4002** |
| api | 3003 | **4003** |
| local CDN (shared) | 5002 | 5002 |

The command prints the ports and credentials when ready. Same database as normal dev (it's the same seeded world).

## Agent accounts (seeded whenever `AGENT_MODE=true`)

| Account | Email | What it has |
|---|---|---|
| Agent user | `agent@kytelink.dev` | Personal org, one published kyte (`@agent`) with links/icons/theme, one unpublished draft edit, MANAGER membership in the seeded agency org (the base seed gives that org the stable id `org_agency_demo` precisely so this attachment can't miss) |
| Agent admin | `agent-admin@kytelink.dev` | Platform `ADMIN` — full admin app access |

Plus the standard seed world (agency org with members, pending invite, scheduled publishes, a suspended kyte, preview links, analytics history) so there is always something real to look at.

## Logging in (two ways, both `AGENT_MODE`-only)

1. **Fixed OTP:** any `*@kytelink.dev` email gets the code `000000`. Implementation note: override better-auth's emailOTP **generation hook** so the stored-and-verified code actually is `000000` for `@kytelink.dev` addresses — do not just print it in the email; the plugin hashes and compares the stored code.
2. **Direct session:** `POST {api}/auth/dev-login {"email":"agent@kytelink.dev"}` → mints a real better-auth DB session via its server session-create API and sets the signed cookie in one call (mounted BEFORE the better-auth `/auth/*` catch-all). For scripted flows and browser automation that skips the login screen.

**Cookie isolation:** cookies are host-scoped, not port-scoped — `:3000` and `:4000` on localhost share a jar. Agent mode therefore uses a **distinct session cookie name** (`kyte_agent_session` vs `kyte_session`), so an agent logging in never clobbers a human dev's session in the same browser. This is the mechanism behind the "no collision" promise, not the ports alone.

## Guardrails (non-negotiable)

- Both mechanisms exist ONLY when `AGENT_MODE=true`; the API **refuses to boot** if `AGENT_MODE=true && NODE_ENV=production`.
- `AGENT_MODE` is absent from every hosted env; `.env.example` documents it under a "local/dev only" heading.
- Agent accounts use the reserved `@kytelink.dev` domain — signup with that domain is rejected outside agent mode (a better-auth `user.create.before` database hook gated on `!AGENT_MODE`), so the accounts can't exist in prod.
- The E2E suite ([17-quality.md](17-quality.md)) reuses dev-login wherever the auth flow itself isn't under test — one mechanism, no parallel hacks.

## Tell future agents

The new repo ships a root `CLAUDE.md` that states, near the top: how to run `pnpm agents`, the port table, both logins, and a one-line tour ("web editor on :4000, admin on :4002 — log in as `agent@kytelink.dev`, OTP `000000`"). Any agent landing in the repo cold should be driving the product within a minute.
