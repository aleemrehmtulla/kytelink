# 01 — Feature-parity contract

*Read this if: you're building the web app, ProfileView, migration, or auditing parity. Every behavior here must exist in the rewrite unless marked **(drop)** or **(change)**. The Phase-4 parity auditor walks this file line-by-line against the running product.*

> The org/teams layer ([04-organizations.md](04-organizations.md)) is an intentional **extension** — it must not change how any existing single-owner profile renders or behaves publicly.

## 1. Old data model (Postgres via Prisma — the migration source)

- **`User`** — next-auth user: `id (cuid)`, `name`, `email (unique)`, `emailVerified`, `image`, `legacy: bool`, `setup: bool`.
- **`Account`/`Session`/`VerificationToken`** — next-auth tables; DB-backed sessions; custom `signIn` callback auto-links same-email OAuth providers.
- **`KyteDraft`** (editor working copy, pk `userId`): `email`, `createdAt`, `username (unique)`, `name`, `description`, `pfp` (URL), `blurpfp` (base64 tiny JPEG), `theme`, `customFont`, `customColor`, `seoTitle`, `seoDescription`, `links (Json)`, `icons (Json)`, `vcf (Json)`, `redirectLink`, `shouldRedirect`.
- **`KyteProd`** — same shape + `banned: bool`; what the public page reads. **Publish = field-by-field copy draft→prod.**
- **`Domains`** — `domain (pk)`, `userId`; managed via Vercel Domains API.
- **`HitPage`/`HitLink`** — analytics rows: `kyteId`, `timestamp`, `referrer`, `country` (**never populated by any code path**), `ip`, `device (MOBILE|TABLET|DESKTOP|UNKNOWN)`; link hits add `linkTitle`, `linkURL`. **(change: → ClickHouse, [07-analytics.md](07-analytics.md))**

### JSON shapes (must survive migration losslessly)

```ts
type TLink = { title: string; link: string; emoji?: string; color?: string }
// emoji is POLYMORPHIC: 'Fa…' react-icons key → icon; contains '://' → <img>; else raw emoji char.
// color = background behind the emoji/icon (usually 'transparent').

type TIcon = { name: string; url: string | null | undefined }
// name holds the ICON_OPTIONS label ('Twitter', 'Github', …), NOT the Fa key; mapped at render
// via the legacy consts/icons.ts. Legacy 'Contact' name exists in old rows: hidden from
// pickers, must still render for existing users.

type Vcf = { firstName?; lastName?; birthday?; email?; phone?; company?; note? }
// DEAD — no UI reads or writes it since July 2023. Founder-confirmed: DELETED in the
// rewrite. The new schema has no vcf column and migration does not carry the data
// (a deliberate, documented data drop — the one exception to "lose nothing", because
// nothing ever rendered it).
```

## 2. Public profile page (`/[username]`)

- Usernames matched lowercased. Unknown → 404.
- SEO: title `seoTitle || "{name || username} | Kytelink"`; description `seoDescription || "Check out {name}'s kyte to grab their links!"`; canonical `https://kytelink.com/{username}`.
- `shouldRedirect && redirectLink` → 302 (prefix `https://` if missing).
- `banned` → "This page has been blocked" shell (phishing notice + appeal contact); content hidden, account preserved.
- Otherwise: themed background (solid or gradient), avatar with blur-up placeholder, name, description, icon row (new-tab links), link buttons with the polymorphic emoji/icon/image prefix + per-link `color`, and the **"kyte." watermark** footer → kytelink.com. **(change: the watermark now links to `kytelink.com/?ref={username}` — never a /signup deep-link — and fires a `watermark_click` product event via `sendBeacon`; this is the viral loop, finally measured — [07-analytics.md](07-analytics.md).)**
- **9 themes**: `dark`, `default` ("Light"), `spacegray`, `popsicle`, `froggy`, `lavender`, `gradientblue/pink/green` ("✨ …"). Shape: `{ bg, bgGradient, previewBorder, userData:{avatar,name,description}, icons, link:{bg,text,border,rounded} }`; gradient themes use `bg: null` + `linear(to-t, …)`. **(change: 3 NEW themes are ADDED — 12 total, [14-design.md](14-design.md); the legacy 9 stay pixel-frozen.)**
- Fonts: `default, sans-serif, serif, monospace, initial, cursive, fantasy` (raw CSS font-family strings). Accent colors: `default ("Theme"), black, white, red.400, green.400, purple.400` — Chakra tokens; the rewrite needs a lossless token→hex map (`red.400→#F56565`, `green.400→#48BB78`, `purple.400→#9F7AEA`). `'default'` = use theme value.
- Analytics per view: page hit {referrer, ip, device-from-UA, username, kyteId}; per link/icon click: link hit {linkURL, linkTitle, referrer, device} — beacon fired, then `window.open`; `href` also set for SEO/right-click.

## 3. Editor (`/edit/[tab]`)

Auth-gated client app operating on the **draft**; autosave (200ms debounce after diffing draft vs published snapshot) + explicit publish (draft→prod copy). Header status labels preserved: `Checking for changes… / Click to publish 🌍 / Publishing… / Published! 🎉`. Live phone-frame preview renders with the SAME component as the public page. Tabs:

- **Links** — add/edit/delete links (title, URL, prefix picker: Fa icon / uploaded image / emoji via emoji-mart), vertical drag-reorder; socials: pick from ICON_OPTIONS + username → prefilled URL, max 5, horizontal drag-reorder. **(change: react-beautiful-dnd → one shared `@dnd-kit` abstraction.)**
- **Design** — avatar upload (+blur), name, description; theme grid with thumbnails **(change: 12 themes — the legacy 9 + the 3 new, [14-design.md](14-design.md))**; font carousel + accent swatches.
- **Settings** — custom domains (DNS records shown: A `76.76.21.21` / CNAME `cname.vercel-dns.com`, status polling), username edit, redirect toggle+URL, SEO title/description, danger zone (change account email → logs out all devices).
- **Analytics** — total views, cumulative 30-day time-series chart, per-link clicks, top-5 referrers. (Country/device breakdowns exist in old API; country always empty. **(change: both become real.)**)

Onboarding for new users (account <20 min old && no username): 4-step modal — SelectUsername (live availability) → NameDescription → SelectAvatar → StarterLinks — then publish.

**(change)** The editor gains: a Kytelink switcher, a Team tab, an Invites page, and scheduled publish — see [04-organizations.md](04-organizations.md).

## 4. Auth (current behavior → deltas)

Current: Google OAuth, GitHub OAuth, email magic link (Loops/SMTP), DB sessions, same-email auto-linking, signups disabled (throws in callback). Target ([05-auth.md](05-auth.md)): **Google + GitHub + email OTP with magic-link autofill via Resend**; signups re-enabled at cutover. GitHub login is **kept — it's crucial**.

## 5. Custom domains

Add domain in Settings → `Domains` row + Vercel API registration. Middleware: known hosts pass through; vanity domains (`yoyo.so`, `downsad.com`, `kyte.bio`, `kyte.lol`) redirect `/` → kytelink.com; any other host → owner lookup → rewrite to `/{username}`; unknown → redirect kytelink.com. **(change: `DomainProvider` interface `vercel|manual`; the raw-SQL Neon edge route dies. All four vanity domains stay functional in middleware — founder still owns them — but only `kyte.bio` and `kyte.lol` are communicated in product UI/ShareKyteModal; `yoyo.so`/`downsad.com` go uncommunicated.)**

## 6. Misc current behavior

- Blur avatar: 5px jimp thumbnail base64 → `next/image` `blurDataURL`, `unoptimized`. **(change: LQIP sibling files generated at upload time, [08-media.md](08-media.md).)**
- PostHog taxonomy (page/link hits, created account, logged in, hit landing/auth/edit, CTA clicks, updated username/avatar, added link, onboarding steps 1–4). **(change: first-party product events, [07-analytics.md](07-analytics.md).)**
- Google Ads gtag ping on editor load **(drop)**; unauthenticated `/api/admin/activelinks` **(drop — superseded by admin app)**.
- Legacy pfp hosts in the wild: `imagedelivery.net`, `*.supabase.co`, `d1fdloi71mui9q.cloudfront.net`, `i.ibb.co` — asset migration handles all ([18-migration.md](18-migration.md)).
- ShareKyteModal: copy profile URL on multiple domains + share to twitter/whatsapp/linkedin/email. **(change: offer `kytelink.com`, `kyte.bio`, `kyte.lol` only — `yoyo.so`/`downsad.com` stay functional but uncommunicated.)**
- Old landing sections (being **redesigned**, [12-landing.md](12-landing.md)): Hero → scroll-gif demo → 8-user avatar grid → domains showcase + "400ms"/"9 Themes" stats → mock analytics → GitHub CTA → "Designed with love. Built with coffee." footer.
- Legal today: auth screens link to literal `/tos.pdf` and `/privacy.pdf` files. **(change: real `/legal` hub + Terms + Privacy pages on the landing app, [12-landing.md](12-landing.md); the PDFs die.)**

## 7. Bugs/debt we must NOT reproduce

Blocking analytics in SSR; unbounded ungrouped analytics queries; unauthenticated upload/admin endpoints; spoofable kyteId in beacons; `country` never written; email triple-written across three tables; focus rings disabled globally (`outline:none` — a11y violation); duplicated reorder helpers; triplicated link-render logic; `device` vs `deviceType` beacon key mismatch; artificial `setTimeout` fake latency; success logged as error; dead code (LandingHeader, `TLink.value`).
