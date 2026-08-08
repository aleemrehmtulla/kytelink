# 14 — Design system, responsiveness, ease of use

*Read this if: you're building web, landing, admin, `packages/ui`, or email templates.*

## Tokens

- **Font:** ONE clean sans everywhere in app chrome — **Inter** (variable, self-hosted via `next/font`, `display: swap`, preloaded). Public profile pages still honor each user's `customFont` (parity). Monospace only for admin data if needed.
- **Color:** shadcn CSS-variable tokens. Neutral zinc base; **one accent: sky-500 `#0EA5E9`** (kite blue) for primary actions/links/focus; semantic green/amber/red for status. Light mode is the product (parity); admin may ship dark. No ad-hoc hex outside the token file — lint-checked.
- **Shape:** `rounded-lg` cards, `rounded-md` controls, one shadow scale.
- **Vibe:** keep the playfulness — 🪁, "Published! 🎉", "Designed with love. Built with coffee." — inside a tight, quiet structure. Whitespace over ornament.
- **Copy voice (applies to every string in the product, marketing, emails, errors):** simple, minimal, clean. Short sentences. Plain words over clever ones. One idea per line. No corporate filler ("leverage", "seamlessly", "empower"), no exclamation-mark spam (the two sanctioned 🎉 moments earn theirs). If a sentence can lose a word, lose it.
- **Brand spelling ruling (founder-confirmed):** the product is **"Kytelink"** — always with a y, capital K only. Never "KiteLink", "KyteLink", or any other camel-case variant, in any copy, code identifier, or doc. Lowercase `kytelink` is for domains/package names; the "kyte." watermark is preserved verbatim.
- **Naming/structure:** per [23-conventions.md](23-conventions.md) — kebab-case files, `components/screens/<route>/`, no comments.

## New themes (founder-confirmed)

Ship **3 new themes** alongside the pixel-frozen legacy 9 (12 total). Design them to be genuinely beautiful and current — e.g. a glassy dark, a warm dusk gradient, a clean mono/paper look (the building agent proposes; the UX critic judges "would a designer pick this?"). Same theme-object shape as the legacy 9, must work with every font + accent, thumbnails committed to `packages/cdn` `assets/themes/`, visual-regression baselines like the rest ([17-quality.md](17-quality.md)). The legacy 9 stay untouched ([01-parity.md](01-parity.md)).

## Motion (framer-motion — required, restrained)

**framer-motion everywhere something appears, leaves, or changes state** — the product should feel sleek and startup-polished, never tacky. Rules:

- One motion vocabulary, defined once in `packages/ui` (`motion.ts`): durations 150–250ms, one ease curve, small distances (4–12px slides, 0.97→1 scales, fades). Components import these presets; no ad-hoc spring values scattered around.
- Animate: modal/sheet entry-exit, tab and wizard step transitions ([22-onboarding.md](22-onboarding.md)), list add/remove/reorder (layout animations on links/icons), publish-state changes, toasts, the auth-page login↔signup morph, admin Live counters (count-up), hover/press affordances on primary CTAs.
- Never: parallax carnivals, bouncing icons, staggered entrances on static content, motion longer than 300ms, or animation that delays interactivity. Respect `prefers-reduced-motion` (all presets collapse to fades/instant).
- **Public profile pages ship ZERO motion-library code** — anything animated there (blur-up, hovers) is CSS-only. The motion vocabulary applies to editor/admin/landing/auth only ([15-performance.md](15-performance.md)).
- The test: a screen-recording should read as "expensive and calm," not "animated."

## Responsiveness (hard requirements)

- Test matrix: **360, 375, 768, 1024, 1440, 1920** — zero horizontal scroll at any of them; Playwright visual tests cover 375 + 1440 minimum.
- Editor: desktop = config left + sticky phone preview right; **<1024px = full-width config with a floating "Preview" button opening a bottom sheet**.
- Touch targets ≥44px; drag handles work via touch AND keyboard (dnd-kit sensors); modals become sheets on mobile where appropriate.
- Landing collapses to single column, phone demo above the fold.

## Ease of use / UX states (checklist per page — a missing state is a bug)

- Every async surface designs **loading / empty / error / offline / unauthorized** states.
- Every destructive action confirms (kyte delete requires typing the username).
- Every error message says what to do next.
- Role-gated controls are visible-but-disabled with a one-line explainer (EDITOR sees why Publish is off) — discoverability over mystery.
- Focus rings **restored and visible** (the legacy app disabled them globally — never again); WCAG AA contrast; `esc` closes modals/sheets; forms submit on Enter; inputs have labels.
- Optimistic UI everywhere in the editor; skeletons only where data is genuinely async (analytics).
- No artificial `setTimeout` delays (legacy habit — banned).
