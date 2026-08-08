# Kytelink Design System — "Kite" brand

**This document is gospel.** It distills the approved redesign prototype in
[`handoff/kytelink-redesign-prototype.html`](./handoff/kytelink-redesign-prototype.html)
(exported from Claude Design, 2026-07-19). Any agent touching UI in this repo
must read this file first and match it. When this file and older docs
(`v2/DESIGN-REWRITE.md`, `rewrite/14-design.md`) disagree, **this file wins** —
with one exception: the focus-ring rule in "Interaction rules" below, which is
a standing user requirement and is preserved here.

The prototype HTML is the source of truth for exact values. If a question isn't
answered here, open the prototype and read the inline styles — do not invent.

## 1. Brand essence

- **Personality:** calm, generous whitespace, friendly but understated.
  "Made with love and caffeine." Free/open-source is a core brand pillar,
  not a footnote.
- **Logo:** the 🪁 kite emoji + lowercase wordmark `kytelink`
  (600 weight, letter-spacing -0.01em, ink color). Never uppercase the
  wordmark. No other emoji as UI chrome except where this doc specifies
  (feature icons, use-case icons, menu glyphs from the prototype).
- **Voice:** short, plain, a little wry. Examples from the prototype (reuse
  this register): "One link for everything you are." · "No plans, no upsells,
  no lock-in." · "Your links and analytics, as JSON. It's yours." ·
  "Gone for good. No dark patterns." · "made with kytelink" ·
  "Free because it's yours."

## 2. Color tokens

### Accent (violet)

| token            | value                   | use                                                 |
| ---------------- | ----------------------- | --------------------------------------------------- |
| `accent`         | `#6D5AE6`               | primary buttons, active states, links, chart lines  |
| `accent-hover`   | `#5747C9`               | link/button hover                                   |
| `accent-soft`    | `#F1EEFD`               | tinted fills: badges, add-link surface, hover fills |
| `accent-border`  | `#CDC3F6`               | borders on accent-soft surfaces                     |
| `accent-glow`    | `rgba(109,90,230,0.28)` | shadow under primary hero CTA only                  |
| `accent-on-dark` | `#A89CF2`               | accent-colored text/icons on ink surfaces           |

### Ink / neutrals (light surfaces)

| token             | value                 | use                                            |
| ----------------- | --------------------- | ---------------------------------------------- |
| `ink`             | `#141419`             | primary text, near-black buttons               |
| `text-secondary`  | `#6F6F78`             | body copy, secondary text                      |
| `text-tertiary`   | `#8A8A93`             | captions, labels, meta                         |
| `text-faint`      | `#A3A3AB`             | placeholders, timestamps, fine print           |
| `text-ghost`      | `#C3C2CC` / `#C9C8D2` | watermark text, drag handles                   |
| `border`          | `#E6E5EC`             | input/button/phone borders                     |
| `border-card`     | `#ECECF1`             | card + dropdown borders                        |
| `border-hairline` | `#F0EFF4`             | dividers, section rules, subtlest card borders |
| `bg-canvas`       | `#FAFAFC`             | app background (dashboard/editor/admin)        |
| `bg-card`         | `#FFFFFF`             | cards, headers, panels                         |
| `bg-tint`         | `#F6F5FB`             | hover rows, selected menu items, chips         |
| `bg-tint-hover`   | `#F0EFF5`             | chip hover, bar-chart tracks                   |

### Ink surfaces (dark sections — marketing bands, terminal cards)

| token              | value                                   | use                                      |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| `dark-bg`          | `#17161C`                               | dark marketing band, "Ink" profile theme |
| `dark-card`        | `#201F27`                               | terminal/code card on dark band          |
| `dark-border`      | `#2C2B34` (cards) / `#33323B` (buttons) |                                          |
| `dark-text`        | `#9D9CA6`                               | body text on dark                        |
| `dark-text-strong` | `#C9C8D2`                               | secondary button text on dark            |
| `dark-muted`       | `#5F5E68`                               | prompt glyphs, faint text on dark        |
| `dark-dot`         | `#3C3B44`                               | decorative terminal dots                 |

### Status

| token           | value     | use                       |
| --------------- | --------- | ------------------------- |
| `success`       | `#3FB96F` | live dot, positive deltas |
| `danger`        | `#C04747` | destructive text/buttons  |
| `danger-border` | `#F2D7D7` | danger-zone card borders  |

Rules:

- White cards on `#FAFAFC` canvas (app) or on white page (marketing). Depth
  comes from hairline borders first, shadow second.
- The violet accent is used _confidently_ (primary buttons, active tab
  underline, toggles, chart fills, badges) but never as large background
  washes except `accent-soft` tints.
- Gradients: only the subtle hero-panel wash
  `linear-gradient(180deg, #F1EEFD, #F6F5FB)`. No saturated gradients
  anywhere (the old purple-gradient buttons are dead).

## 3. Typography

- **Face:** Inter (existing `--font-sans`), the production equivalent of the
  prototype's Helvetica Neue. Antialiased.
- **Headline scale** (all 700 weight, ink, tight tracking):
  - Hero h1: 72px desktop / ~40px mobile, line-height 1.05,
    letter-spacing -0.035em, `text-wrap: balance`.
  - Section h2: 34–36px, letter-spacing -0.025em.
  - Card/stat numerals: 28px, 700, letter-spacing -0.02em.
- **Body:** 19px/1.6 hero subcopy · 15px/1.65 standard body ·
  13px/1.5–1.55 card body & UI copy, all in `text-secondary`.
- **UI text:** 14px/500 nav + buttons + tabs · 13px menus/inputs ·
  12px meta · 11px dropdown section labels.
- **Uppercase labels:** 12px (11px in menus), 500–600 weight,
  letter-spacing 0.05–0.08em, `text-tertiary` (or accent-on-dark on ink).
- **Monospace:** terminal cards and image placeholders only.

## 4. Shape & elevation

Radii:

- `99px` (pill): ALL standalone buttons, badges, chips, toggles, avatars.
- `24px`: large marketing panels (hero showcase, dark band).
- `16px`: page-level frames, dropdown menus.
- `14px`: app cards, list rows, add-link button.
- `10–12px`: inputs, small buttons inside cards, icon tiles, menu items.
- `36px`: phone-preview frame. `28px`: mini profile card top corners.

Shadows (rgba ink base `20,18,40`):

- `shadow-card-rest`: `0 2px 6px rgba(20,18,40,0.06), 0 24px 64px rgba(20,18,40,0.08)` — large framed surfaces.
- `shadow-menu`: `0 16px 40px rgba(20,18,40,0.14)` — dropdowns/popovers.
- `shadow-phone`: `0 16px 48px rgba(20,18,40,0.08)` — phone preview.
- `shadow-cta`: `0 8px 24px rgba(109,90,230,0.28)` — hero primary CTA only.
- Ordinary app cards get **no shadow** — border only.

## 5. Core components

**Primary button** — pill, `accent` bg, white text, 500 weight; 14px text with
`9px 18px` padding (nav) or 16px text with `15px 32px` (hero). Hover: darken
to `accent-hover`. On ink surfaces the primary pill is white with ink text.

**Secondary button** — pill, white bg, `1px solid border`, `text-secondary`
text. On ink surfaces: transparent, `1px solid #33323B`, `dark-text-strong`.

**In-card buttons** — rectangular 10px radius: ink-filled (`#141419`, white
text — e.g. "Connect") or outlined (`border`, ink text — e.g. "Download").

**Danger** — outlined `danger-border`, `danger` text. Danger-zone cards:
white bg, `danger-border` border, title in `danger`.

**Badge/eyebrow** — pill, `accent-soft` bg, `accent` 13px text, 7px 14px
padding, leading 6px accent dot.

**Tabs** — text row with 30px gaps over a 1px `#ECECF1` rule. Active: ink
text + 2px accent underline (overlapping the rule, margin-bottom -1px).
Inactive: `text-tertiary`, hover ink. 14px, 500.

**Cards** — white, `1px solid #ECECF1`, radius 14px, padding 20px. Card
title: 13px/600 ink. Marketing use-case cards: `#FAFAFC` bg,
`#F0EFF4` border, radius 18px, padding 24px 22px.

**Inputs** — 42px tall, white, `1px solid border`, radius 10px, 13px text,
placeholder `text-faint`.

**Toggle** — 34×20px pill, accent when on (knob white 16px), `#E1E0E8`-ish
neutral when off.

**Dropdown/popover** — white, `1px solid #ECECF1`, radius 16px, 6px padding,
`shadow-menu`. Items: 10px radius, 8–9px 10px padding, hover `bg-tint`.
Section labels: 11px uppercase `text-faint`. Dividers: 1px `#F0EFF4` with
6px 4px margin.

**Add-link affordance** — full-width 52px, `1px solid accent-border`,
radius 14px, `accent-soft` bg, accent 14px/500 text "+ Add link". Dashed
borders are banned product-wide — add/upload affordances use solid borders
on tinted surfaces.

**List row (editor link)** — white card row, radius 14px, padding 16px 18px:
grab handle (`⋮⋮` ghost), title 14px/600 ink + url 12px `text-faint`,
meta ("72 clicks"), accent toggle.

**Stat tile** — card with 12px `text-tertiary` label, 28px/700 numeral,
12px `success` delta.

**Charts** — accent line (2px, round caps) with 8%-opacity accent area fill.
Bar lists: 8px pill track `#F0EFF5`, accent pill fill.

**Terminal card** — `dark-card` bg, `1px solid dark-border`, radius 16px,
monospace 13px/2, three `dark-dot` dots; prompt `$` in `dark-muted`, output
line in `accent-on-dark`.

**Phone preview** — 280×580, white, `1px solid border`, radius 36px,
`shadow-phone`. Public profile: avatar is a plain 120px circle — no ring, no
border, no shadow, no backdrop fill, 12px gap to the name (never reintroduce
the ring; it was removed deliberately), name 22px/700/-0.02em, bio 14px
`text-tertiary`, link buttons 56px tall, 15px/500, `1px solid border`, radius
per user's shape setting (rounded 12px / pill 99px / square 4px), hover →
accent border + accent text + accent-soft bg, `transition all .15s`.
Footer watermark: "made with kytelink" 12px `text-ghost`, and removable —
a one-click toggle in the editor's Settings tab drops it entirely.

**Avatar placeholders** (empty states): repeating 45° stripes
`#E9E7F4`/`#F2F0FA`, monospace micro-label.

## 6. Layout patterns

- Marketing page: white, max content 1280px; header `28px 48px`; sections
  center-aligned, 96px vertical rhythm; inner feature panels 960px wide,
  radius 24px. Footer: hairline top rule, 5-column grid (brand 1.5fr + 4×1fr),
  uppercase 12px column headers, 13px `text-tertiary` links, bottom bar with
  © line + hairline rule.
- App (editor/admin): full-height `#FAFAFC`; white top bar `16px 32px` with
  hairline bottom border; breadcrumb `🪁 kytelink / [org switcher ▼]`; right
  side: URL chip (pill, `bg-tint`, live `success` dot, copy icon) + accent
  "Publish ▼" pill + 32px avatar.
- Editor body: left phone-preview column (480px, centered, hairline right
  border) + right panel (`36px 48px` padding, tabs at top, content max-width
  560–640px).
- Mobile: single column; phone preview collapses (editor shows preview via
  toggle or stacked); hero h1 ~40px; grids collapse 4→2→1; nav collapses to
  minimal header. Everything must be fully responsive — no horizontal
  scroll at any width ≥320px.

## 7. Interaction rules

- **Focus (standing user rule — do not regress):** no focus rings, no
  focus-only border changes, no `ring-*` utilities, `outline: none`
  everywhere. Resting borders only.
- Hovers are quiet: background tint (`bg-tint`), text darkening, or border
  swap. `transition: all 0.15s` on profile links; nothing bouncy.
- **Dialogs, modals, and sheets NEVER animate in or out (standing user
  rule — do not regress):** no fade, scale, slide, or exit animations on any
  modal-layer surface (dialogs, modals, sheets/drawers, command palettes,
  confirm dialogs) or their backdrops. They appear and disappear instantly —
  snappy beats smooth. No `AnimatePresence`, no `transition`/`animate` props,
  no `data-[state]` animation utilities on these surfaces.
- **Button loading state (standing user rule — do not regress):** a loading
  button shows a bare spinner and NOTHING else, and its width must be
  identical loading vs not loading. Never swap the label — "Save" must never
  become "Saving…", and no "…" label variants anywhere. The technique: put
  `relative` on the button, keep the children mounted to reserve their exact
  width but hide them with `<span class="contents invisible">`, and absolutely
  center the spinner over them with
  `<span class="absolute inset-0 flex items-center justify-center">`.
  (`visibility` inherits through `display: contents`, so the label hides while
  still occupying layout — verified in-browser; do not "simplify" this to a
  conditional that unmounts the children, that reintroduces the width jump.)
  Never render the spinner as a *sibling* of a still-visible label — that is
  the old bug. Spinners inherit `currentColor` so they stay visible on filled
  variants.
- **Disabled buttons never change color on hover (standing user rule — do not
  regress):** gate every hover utility on a button behind `not-disabled:`
  (`not-disabled:hover:bg-tint`, not `hover:bg-tint`). Use `not-disabled:`,
  NOT `enabled:` — `:enabled` only matches form elements, so it silently kills
  hover on `asChild`/`<a>` buttons. Keep `disabled:cursor-not-allowed` and
  `disabled:opacity-50`; do not reach for `disabled:pointer-events-none`,
  which suppresses the not-allowed cursor. For `aria-disabled` anchors use
  `aria-disabled:pointer-events-none`. Both rules are already implemented in
  the shared `Button` in `apps/web/components/ui/button.tsx` and
  `apps/admin/components/ui/button.tsx` — prefer those over a raw `<button>`.
- No skeleton shimmer theatrics; use the striped placeholder pattern.
- `overscroll-behavior-y: none` on app scroll surfaces.
- Cursor pointer on all interactive elements.

## 8. Per-surface direction

- **Landing home:** header (kite + wordmark, GitHub icon, "Log in", accent
  pill "Create yours") → badge "100% free · open source · forever" → 72px
  hero "One link for everything you are." → subcopy → accent CTA pill +
  "Star on GitHub" secondary → microcopy "kytelink.com/yourname — claimed in
  30 seconds" → showcase panel (lilac gradient, radius 24, mini profile card
  rising from bottom edge + 4 feature blurbs w/ 34px icon tiles) → "Made for
  whatever you make." 4-up use-case grid → ink open-source band ("Free
  because it's yours." + terminal card, white pill CTA + outlined
  "Self-hosting guide") → footer.
- **Editor:** per the Dashboard frame of the prototype — tabs Links / Design
  / Analytics / Settings (+ Team where orgs need it), all content styled per
  §5. Links tab: add-link button, link rows, "Socials" icon tiles
  (40px, radius 12) + solid "+" tile. Design tab: theme swatch cards
  (72×96, radius 12, selected = 2px accent border) + button-shape picker.
  Analytics tab: 3 stat tiles, page-views line chart card, top-links bar
  list. Settings: custom-domain card (input + ink Connect), data-export
  card, danger-zone delete card.
- **Public profile:** exactly the Public-profile frame (§5 phone preview
  spec at full-page scale, 420px column, 88px top padding).
- **Admin:** same system, but on a **pure-white canvas** — this is a standing
  user rule and the one place `bg-canvas` is not `#FAFAFC`. `apps/admin`'s
  tailwind config overrides `canvas` to `#FFFFFF` and re-tints `tint` /
  `tint-hover` to `#F7F5FE` / `#F1EEFD`, so no surface in admin is grey:
  separation comes from hairline borders, and every hover / selected / active
  fill is faint violet. Do not reintroduce a grey app background or grey
  hover fills. White cards, hairline borders, pill chips, accent charts.
  Rows of related numbers use the `StatGroup` primitive — one bordered card
  split by hairlines — not N free-standing stat boxes, and a group is even
  (2/3/4/5/6 cells), never left with a ragged last row. A headline number that
  belongs with a group leads it as an `accent`-toned cell rather than sitting
  in a taller box beside it. Admin may keep denser tables but must use these
  tokens (no ad-hoc grays, no blue accent).
- **Admin density (standing user rule):** a page should fit a laptop screen
  without scrolling wherever the data allows. Page descriptions are one line;
  filter chrome is one row (rare filters go behind a disclosure); a table's
  rows get the remaining height. There is no page footer — build/version and
  self-hosting links live in the account menu.
- **Admin navigation:** sections with more than one view get sub-pages listed
  under the rail item (`NavItem.children`), not in-page tabs — see Moderation
  (Queue / Reports / Patterns) and Storage (Overview / By org / Orphaned
  files). `NAV_DESTINATIONS` is the flattened leaf list the command palette
  and the mobile strip navigate between.
- **Self-hosting:** a real page on the landing site (linked from footer
  "Self-hosting" and the ink band's "Self-hosting guide" button), rendering
  the guide with this system: terminal cards for command blocks, cards for
  the capability matrix.

## 9. What died in this redesign

- Sky-blue `#0EA5E9` accent — replaced by violet `#6D5AE6` everywhere
  (including `packages/ui` tokens and the tailwind preset).
- Purple→blue gradient buttons, heavy drop-shadowed link cards.
- Near-black primary buttons on marketing surfaces (pills are accent now;
  ink-filled rectangles survive only as in-card actions like "Connect").
- Any Linktree-style dense/boxy layouts. Whitespace is a feature.
