# 12 — apps/landing: marketing site (home redesign, feature pages, use cases, legal)

*Read this if: you're the landing agent. This doc is self-contained; also read [14-design.md](14-design.md) (tokens/font/motion/copy voice), [15-performance.md](15-performance.md) (budgets), [16-seo.md](16-seo.md) (metadata), [09-cdn.md](09-cdn.md) (where images live). You do NOT need the API/database docs.*

Next.js **pages router**, Tailwind + shadcn, fully static (no runtime data; GitHub stars fetched at build). Deployed separately, served under `kytelink.com` via the web app's multi-zone rewrite — set `assetPrefix: '/landing-assets'`; all CTAs are absolute links into the web zone (`/signup`, `/login`). Copy voice everywhere: **simple, minimal, clean** — short sentences, no filler, warm but quiet ([14-design.md](14-design.md)).

## Site map (all shipped day one)

```
/                         home (redesign, below)
/features/analytics       /features/custom-domains   /features/themes
/features/teams           /features/scheduled-publishing   /features/open-source
/use-cases/creators       /use-cases/musicians       /use-cases/agencies
/legal                    legal hub
/terms-of-service         /privacy-policy
/report                   report abuse (footer-linked only)
404
```

Blogs and competitor comparisons are **deliberately skipped for v1** — don't scaffold empty routes or dead links; the flat-page conventions here make adding them later trivial.

## Home (redesign — same vibe, better structure)

Keep the vibe — playful, kite 🪁, warm, open-source-proud, "Designed with love. Built with coffee." — inside a cleaner, quieter, modern structure. Motion: framer-motion per the [14-design.md](14-design.md) vocabulary — gentle scroll-reveals, calm hover states; sleek, never tacky.

1. **Header** (shared across all landing pages): sticky, translucent blur; logo; `Features` dropdown (the six), `Use cases`; `Log in` ghost + `Get started` primary. Collapses gracefully on mobile.
2. **Hero:** "A simple link-in-bio. Free and open source." + subline (custom domains · 12 themes · real analytics · blazing fast) + `Create your Kytelink` / `View an example`. Visual: a **live `<ProfileView>`** (from `packages/ui`) in a phone frame auto-cycling themes — the real renderer, so the demo never drifts. Mobile: single column, demo above the fold.
3. **Social proof:** avatar row of real profiles ("Join thousands of creators") from `packages/cdn` assets.
4. **Feature grid:** six cards, each linking to its feature page.
5. **Analytics showcase:** the real analytics components with believable mock data.
6. **Open source band:** star CTA with build-time star count.
7. **Final CTA + footer.**

## Feature pages (`/features/*`) — the barberflow pattern

Each page: hero (one-line promise + CTA) → **2–4 custom-built product mockups** — real components from `packages/ui` fed with mock data (mini analytics dashboard, theme fan, team-roles sheet, schedule timeline…), NOT screenshots, so they're crisp, themeable, and never stale → short feature bullets → closing CTA band. Per-feature components live in `components/features-pages/<feature>/` (kebab-case, [23-conventions.md](23-conventions.md)); imagery/illustrations committed to `packages/cdn/assets/landing/`.

The six: **Analytics** (real charts, privacy-clean angle), **Custom domains** (DNS-to-live flow mockup), **Themes** (12-theme fan + fonts/accents), **Teams** ("run every artist's page from one login" — roles, invites, one-click revoke), **Scheduled publishing** (the midnight-album-drop story, snapshot timeline mockup), **Open source** (self-host in 15 minutes: compose snippet, GitHub stats, the "nothing closed, no mandatory SaaS" promise, and the graceful-degradation story — "runs without ClickHouse or S3; features switch off cleanly, nothing breaks" — linking to `SELF-HOSTING.md` on GitHub, [25-selfhost.md](25-selfhost.md)).

## Use-case pages (`/use-cases/*`)

Narrative-first: **Creators** (claim your handle, live in 60 seconds), **Musicians** (schedule the single for the 1st and the album for the 5th), **Agencies** (fifteen client pages, one login, granular roles). Each: hero story → the 2–3 relevant feature mockups reused → testimonial slot (placeholder quotes, swappable consts) → CTA. Thin, honest pages — no SEO sludge.

## Legal (`/legal`, `/terms-of-service`, `/privacy-policy`) — replaces the legacy PDF links

Mirror the proven barberflow layout:

- **`/legal` hub:** heading + cards, one per document (icon, title, one-line description, last-updated date), animated in subtly.
- **Document pages:** content stored as **structured data modules** (`lib/legal/terms.ts`, `lib/legal/privacy.ts`: `{ lastUpdated, sections: [{heading, paragraphs}] }`) rendered by ONE shared legal-content component — table of contents, anchored headings, readable measure. Legal JSON-LD + full metadata per [16-seo.md](16-seo.md).
- **Content:** draft real, plain-English Terms (free service, acceptable use, moderation/suspension rights, the hosted-vs-self-hosted distinction) and Privacy (what's collected — account email, profile content, privacy-clean analytics with hashed IPs; Resend/R2/OpenAI as processors; user rights — **including that data export or deletion is requested by emailing the contact address, one const the founder confirms before launch**). Write it clearly, then flag prominently in PROGRESS.md: **founder must review legal text before launch — agents are not lawyers.**
- The web app's auth screens and footers link here (the legacy `/tos.pdf` + `/privacy.pdf` die).

## Report abuse (`/report`) — footer-linked only (founder-confirmed)

Never linked from profile pages. One calm page: short heading ("Seen a Kytelink impersonating a company or running a scam?"), a small form — profile URL or username, reason select (impersonation/phishing · NSFW · other), optional details — POSTing `{usernameOrUrl, reason, details?}` to the API's public `POST /report` endpoint (for this stream: one fetch to the API base URL; it's rate-limited server-side). Success state is always the same neutral "Thanks — we'll take a look" (never confirms whether a username exists). Reports land in the admin moderation queue as requests to suspend ([10-moderation.md](10-moderation.md)).

## Footer (proper, shared across landing; slim variant reused by web)

Four quiet columns + brand row: **Product** (the six feature pages) · **Use cases** (the three) · **Company** (GitHub, X, self-hosting guide → `SELF-HOSTING.md` on GitHub, Report abuse → `/report`) · **Legal** (Terms, Privacy, Legal hub). Brand row: logo, "Designed with love. Built with coffee.", star-us link. No newsletter box, no clutter.

Ownership note: the footer **component** (full + slim variants) lives in `packages/ui` (built by the web stream, since landing and web can't import each other's app code); its links come from a `nav-config` const that THIS stream populates. You own the content, they own the shell.

## Requirements

- Budgets: Lighthouse ≥95 all categories on every page, LCP <1.5s 4G, CLS = 0, zero horizontal scroll 360→1920.
- Every image: explicit dimensions, lazy below the fold, served via `getCdnUrl` ([09-cdn.md](09-cdn.md)).
- SEO per [16-seo.md](16-seo.md): unique metadata + OG per page, JSON-LD, semantic headings, feature/use-case/legal pages in the sitemap.
- Minimal JS (theme-cycling demo, star count, mobile nav, the `/report` form POST, fire-and-forget internal-analytics beacons `hit_landing`/`clicked_get_started` via `/t/event`, and **capturing `?ref={username}` into a 24h first-party `kyte_ref` cookie — the marketing site's ONE cookie — so `signup_completed` can attribute watermark signups** ([07-analytics.md](07-analytics.md)) — that's it); CTAs viewport-prefetched.
