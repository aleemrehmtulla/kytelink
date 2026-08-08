# 05 — Auth: better-auth on the API

*Read this if: you're building the API, the web auth pages, or migration. Companion: [06-api.md](06-api.md), [04-organizations.md](04-organizations.md).*

## Methods (final)

**better-auth** mounted on the Fastify API at `/auth/*`. Four sign-in methods, one shared login/signup component (login and signup are the same flow — a verified identity that doesn't exist yet creates an account; screen design + morphing UX in [22-onboarding.md](22-onboarding.md)):

1. **Google OAuth**
2. **GitHub OAuth** — kept, it's crucial (open-source audience).
3. **Email OTP with magic-link autofill** — see below.
4. **Passkeys** (better-auth passkey plugin) — **login only** as an entry point (no account exists at signup to bind to). Registered post-signup: a one-time dismissible nudge after the second login, plus full management in account settings (list, add, rename, remove). Conditional UI (passkey autofill on the email field) where the browser supports it. A passkey miss fails softly inline to the other methods — never a dead end. **RP ID is pinned to `kytelink.com` (the apex), NOT `api.kytelink.com` where better-auth is mounted** — credentials must work for users on `kytelink.com` and survive any auth-host move; local dev/agent mode uses RP ID `localhost` (WebAuthn ignores ports).

Same-email auto-linking across all providers (better-auth trusted-provider account linking), preserving today's behavior: sign in with Google once and GitHub later on the same address → one account.

## Email OTP flow

- User enters email → better-auth `emailOTP` plugin issues a **6-digit code** (10-min TTL, max 3 verify attempts then invalidated, single-use, constant-time compare).
- ONE email is sent containing **both** the large code and a button linking to `https://kytelink.com/auth/verify?email=…&otp=…`. The verify page autofills the code from the query and auto-submits. Typing the code and clicking the link converge on the same `verifyOTP` call — one code path, user's choice.
- Verify page UX: shadcn `input-otp` (6 boxes, paste-friendly, auto-advance, auto-submit on 6th digit), resend with visible cooldown, clear errors for wrong/expired codes.
- Subject: `Your Kytelink login code: {otp}`. Template: React Email, clean/branded per [14-design.md](14-design.md), plain-text fallback.

## Email delivery

`packages/emails` interface: `EMAIL_PROVIDER=resend|smtp|console`.

- **Hosted: Resend**, from **`Kytelink <auth@mail.kytelink.com>`** — dedicated `mail.` subdomain verified in Resend with SPF/DKIM/DMARC, isolating root-domain reputation.
- **Self-host:** SMTP, or `console` (default — prints to stdout; mailpit in docker-compose gives a local inbox UI so E2E tests can read OTPs).
- The same interface sends the org emails (invites, notifications — inventory in [04-organizations.md](04-organizations.md)).

## Sessions

DB-backed, cookie `Domain=.kytelink.com; Secure; HttpOnly; SameSite=Lax` — shared by web and admin. better-auth CSRF protection on. `changeEmail` requires OTP verification of the NEW address and invalidates all sessions (parity with today's "logs out all devices").

## Identity vs orgs/kytes

A `User` is only an identity — **signup creates the User row and nothing else**. The personal Organization + first Kyte + OWNER membership are created together, lazily, when the user completes onboarding or hits "New Kytelink" ([04-organizations.md](04-organizations.md), [22-onboarding.md](22-onboarding.md)). A user arriving via an invite link can accept and end up with zero owned orgs and one membership — that's valid and no personal org exists until they want their own page.

## Migration

next-auth rows → better-auth schema: `User` ids preserved; Google + GitHub `Account` rows mapped (test on staging: one Google user, one GitHub user, one magic-link-era user — all three must sign in); magic-link-era users simply use OTP now; sessions dropped (users re-login — acceptable). Details in [18-migration.md](18-migration.md).

## Testing hook

E2E and integration suites need OAuth without real providers: a dev-only mock OIDC provider inside `apps/api`, enabled by `AUTH_MOCK_PROVIDERS=true` (refused at boot when `NODE_ENV=production`), which better-auth consumes like any provider and which signs in as any email the test requests. Passkey E2E uses Playwright's virtual authenticator. Documented here so W1 builds the toggle and the E2E harness ([17-quality.md](17-quality.md)) consumes it — nobody invents their own mock.

## Rate limits (enforced in [06-api.md](06-api.md))

`otp-send` 3/15min per email + 10/hr per IP · `otp-verify` 5/15min per email · `oauth` 30/hr per IP.
