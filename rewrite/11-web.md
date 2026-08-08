# 11 — apps/web: kytelink.com

*Read this if: you're building the web app or `packages/ui`. Companion: [01-parity.md](01-parity.md), [04-organizations.md](04-organizations.md), [05-auth.md](05-auth.md), [14-design.md](14-design.md), [15-performance.md](15-performance.md), [16-seo.md](16-seo.md).*

Pages router. Pages: `/[username]`, `/edit/[kyteId]/[tab]` (links|design|analytics|settings|team), `/invites`, `/preview/[token]`, `/login`, `/signup`, `/auth/verify`, `/auth/error`, `/account` (email, passkeys), `/404`, `/500`. File/component naming per [23-conventions.md](23-conventions.md); motion per [14-design.md](14-design.md) (framer-motion, sleek not tacky).

## Static profile pages

- `getStaticPaths: { paths: [], fallback: 'blocking' }`; **no `revalidate` interval** — pages are immutable until on-demand revalidation.
- `getStaticProps`: fetch profile JSON from the API internal endpoint (HMAC service token; Redis-cached) → `notFound` | `redirect` (SSG supports both) | suspended shell | banned shell | `<ProfileView>` from `packages/ui`.
- **Revalidation (the complete trigger list — anything that changes what a public URL serves):** publish / scheduled publish / suspend / **unsuspend** / ban / **unban** / username change / **kyte delete** / **account delete** → API enqueues → worker POSTs `{paths}` HMAC-signed to the revalidate hook. Username change revalidates old (→404) and new; deletes revalidate the old username to 404.
- **⚠️ The one API-folder exception:** pages-router on-demand revalidation only works via `res.revalidate()` in an API route. Web ships exactly one: `pages/api/internal/revalidate.ts` (HMAC + timestamp check → revalidate each path). Zero business logic. This is the sole, documented exception to "no API folder" — founder-accepted.
- Self-host cache note: Vercel persists the ISR cache across deploys; bare `next start` does not — document it; support a persistent cache volume.
- **Bundle discipline:** the profile route ships the framework runtime + ≤10KB of route JS (beacons + minimal hydration, nothing else). framer-motion, chart.js, dnd-kit, and emoji-mart must NEVER appear in the profile bundle — they are editor-only, enforced by a CI bundle check ([15-performance.md](15-performance.md)).

## Middleware (edge, no DB)

- Landing-zone rewrites (multi-zone: landing deploys separately, sets `assetPrefix:'/landing-assets'`): web rewrites `/`, `/landing-assets/:path*`, **and every marketing route** — `/features/:path*`, `/use-cases/:path*`, `/legal`, `/terms-of-service`, `/privacy-policy`, `/report` — to the landing zone. This list lives in ONE shared const (`consts/landing-routes.ts`) used by both the middleware and the username reserved-word blocklist, so a new marketing page can never be shadowed by (or shadow) a profile.
- Custom domains: unknown host → cached host→username lookup (internal endpoint; **misses are cached too — NONE tombstone, 60s — so a bot sweeping random hostnames never hammers the API**, [02-architecture.md](02-architecture.md)) → rewrite `/:username`; vanity domains' root → redirect kytelink.com; unknown domain → redirect kytelink.com.
- Skip lookups for `_next/*`, static assets, beacons.
- `www.kytelink.com` → apex is a Vercel-level redirect (founder-configured); no middleware code.

## Editor

Same IA as legacy ([01-parity.md](01-parity.md) §3) + the org layer ([04-organizations.md](04-organizations.md)):

- Routes `/edit/[kyteId]/[tab]`; `/edit` redirects (last-used cookie → first accessible kyte → onboarding). Legacy `/edit/:tab` URLs (the old app had no kyteId — links|design|analytics|settings) redirect through the same resolution, so old bookmarks keep working. Header switcher is **progressively disclosed** per [04-organizations.md](04-organizations.md): flat kyte list for solo users; the org tier appears only once a second org/team exists. Solo users must never encounter team/org concepts anywhere in the editor.
- Tabs: Links, Design, Analytics, Settings, **Team** (members sheet, invites, Activity/audit view — [04-organizations.md](04-organizations.md)). Role-gates from `effectiveRole` + `can` — EDITOR sees a disabled Publish with an explainer; VIEWER gets read-only inputs and no Analytics tab.
- Draft state in zustand; tRPC mutations; 200ms-debounced autosave; **optimistic updates everywhere** (preview reflects keystrokes instantly; rollback + toast on error). Live preview = `<ProfileView isPreview>` — the exact public renderer.
- Publish split-button: "Publish now" / "Schedule…"; schedules panel lists up to 3 pending snapshots (mini previews, update/reschedule/cancel); banner summarizes the next fire time.
- **Preview links panel**: create/copy/revoke draft preview URLs — the copy button copies URL + the 6-digit passcode together ([04-organizations.md](04-organizations.md)); `/preview/[token]` shows a passcode gate (same `input-otp` component), then SSRs the draft via the HMAC `POST /internal/previews/:token` endpoint ([06-api.md](06-api.md) — web still never touches the DB) with a "Draft preview — not live" banner, `noindex`, no beacons.
- **Import flow** (Links tab + onboarding step 3 — [22-onboarding.md](22-onboarding.md)): paste a Linktree / Beacons / Bio.link URL (or any URL when the AI path is available) → `import.fromUrl` proposal → checkbox rows the user confirms into the draft ([06-api.md](06-api.md)).
- **Suspended/banned kytes**: the editor route renders the full-screen locked suspended state instead of tabs (read-only lockdown + appeal copy per [10-moderation.md](10-moderation.md)); the kyte switcher badges it.
- **Limit modal**: any `LIMIT_REACHED` error renders the shared contact-Aleem modal ([04-organizations.md](04-organizations.md)).
- Presence hint ("Sarah is editing") via Redis heartbeat; stale-save warning on conflicting autosave.
- Drag & drop: ONE shared `@dnd-kit` sortable abstraction for links (vertical) and icons (horizontal), touch + keyboard accessible.
- Charts: chart.js behind a clean React wrapper (the legacy imperative canvas file dies).
- Motion: framer-motion on tab transitions, sheet/modal entry, list reorder, publish states — subtle and fast per [14-design.md](14-design.md).

## Auth pages, onboarding & invites

- Full spec in [22-onboarding.md](22-onboarding.md): split-screen login/signup with showcase panel, passkey option, login↔signup morphing, and the publish-ASAP wizard (slug → name+pfp → optional links → live).
- `/auth/verify` autofills the OTP from the query and auto-submits ([05-auth.md](05-auth.md)).
- `/invites`: pending invites for the session's verified email → Accept/Decline; badge in editor header; invite-link landing handles logged-out → login → return.

## Suspended/banned/404 shells

Static, on-brand, `noindex`; suspended and banned shells both carry the shared appeal copy ("Think this is a mistake? DM @aleemrehmtulla on X with your username" — [10-moderation.md](10-moderation.md)). 404 suggests claiming the username (growth loop): "kytelink.com/{username} is available — claim it".
