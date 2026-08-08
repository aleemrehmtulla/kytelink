# Kytelink v2 UI rewrite — design spec & plan

North-star: **clean, minimal, structured, responsive**. shadcn-based. No focus
rings, no focus-only borders — resting borders only, `outline: none` everywhere.
`overscroll-behavior-y: none` (not overflow) on app scroll surfaces. Kite emoji 🪁
is the brand mark; no other emoji as UI chrome (use lucide-react icons).

## Design tokens (light)

| token | value | note |
| --- | --- | --- |
| `--background` | `#ffffff` | app bg is `--muted` (#fafafa) for structure |
| `--foreground` | `#18181b` | zinc-900 |
| `--muted` | `#fafafa` | app canvas / subtle fills |
| `--muted-foreground` | `#71717a` | zinc-500 secondary text |
| `--border` | `#e4e4e7` | zinc-200, the ONLY border color |
| `--card` | `#ffffff` | |
| `--primary` | `#18181b` | near-black primary action (clean/minimal) |
| `--primary-foreground` | `#ffffff` | |
| `--accent` | `#0ea5e9` | sky — selected/active/links ONLY, used sparingly |
| `--danger` | `#ef4444` | |
| `--success` | `#22c55e` | |
| `--radius` | `0.625rem` | lg; md = calc(radius - 2px) |

Primary buttons are near-black; the accent is reserved for active tab
underline, selected rows, and links. This reads more premium/minimal than
sky-blue-everywhere.

## Focus / borders (hard rules from user)

- Never a ring. Never `ring-*`, never `focus-visible:ring-*`, never a glow.
- Never a focus-only border color change. Resting border only.
- Remove global `*:focus-visible { outline }`. Set `*:focus-visible { outline: none }`.
- shadcn component defaults ship rings — strip them from every generated primitive.

## Information architecture (new)

- `/` (web) — if signed-in → redirect `/home`; else marketing splash → landing.
- `/home` — **dashboard**: your organizations, each listing its Kytelinks.
  Create Kytelink, create organization, open org settings, pending-invites banner.
- `/edit/[tab]` — editor, page-scoped only (links, design, analytics, settings).
  **Team tab removed** — membership is org-level, lives in org settings.
- `/orgs/[orgId]/settings` — **organization settings** (new): general (rename),
  members + invites, storage (used / limit), danger zone (delete / leave).
- `/account` — you: profile email, passkeys, your organizations list + create org,
  sign out. Clean, no window.prompt.
- `/invites` — pending invites, accept/decline, lands you in the joined org.
  Surfaced with a count badge from /home + account.
- Auth / onboarding — reskinned, emoji removed except 🪁 brand.

## Editor fixes

- Custom shadcn `Tabs` (accent underline), not hand-rolled buttons.
- **One** publish control: a single Publish button (primary) with a caret →
  dropdown for "Schedule…". Autosave state shown as passive muted text
  ("Saved" / "Saving…"), never a second clickable publish.
- Share modal → clean shadcn `Dialog`: copy-URL field + domain chips + socials.
- Kyte switcher + account menu → shadcn `DropdownMenu`.
- Widescreen: content max-width raised, preview column widens, `xl:` layout,
  no huge empty gutters. `overscroll-y-none` on the editor scroll area.

## Landing fixes (targeted, keep Tailwind)

- Logo → 🪁 kite emoji + "kytelink" wordmark (kill the double CDN-svg logo).
- Remove all emoji-as-icons (features grid/hero) — use lucide or none.
- Kill all `focus-visible:ring-*` (shared base `button-link.tsx:7` + header/nav/grid).
- Widen container for widescreen; de-slop hero.

## Waves

0. Foundation — tokens, cn, globals, shadcn primitives (button, input, label,
   dialog, dropdown-menu, tabs, sheet, select, switch, avatar, badge, card,
   separator, tooltip, progress, sonner). **[me]**
1. Editor rewrite — header, tabs, publish, share, switcher, shell, widescreen.
2. New IA — /home, /orgs/[id]/settings, /account, /invites, backend org.storage
   in ApiClient + mock-client.
3. Onboarding + auth reskin.
4. Landing cleanup.
5. Critique pass (design-critique) + visual verification + typecheck/lint.
</content>
</invoke>
