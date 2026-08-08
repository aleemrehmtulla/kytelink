# 23 — Code conventions (naming, structure, comments)

*Read this if: you're writing ANY code in this repo. These conventions are modeled on two of the founder's production monorepos (barberflow, koala) — those repos aren't available to agents; this doc is the distilled standard. The DRY/quality critic enforces it.*

## File & folder naming

- **Everything lowercase, kebab-case:** `truncated-text.tsx`, `booking-totals.ts`, `use-availability.ts`. No PascalCase files, no PascalCase folders (the legacy repo's `components/Editor/Config/AddIcons/Modal/` nesting is exactly what we're killing). Exports stay PascalCase for components (`export function TruncatedText…`), camelCase for functions.
- **Shallow nesting.** Max ~2 levels under `components/`. Prefer a flat folder of well-named files over a taxonomy of folders each holding one `index.tsx`.
- `index.tsx` only as a screen/section entry point, never as the sole file in a one-file folder.

## App-internal structure (each Next app)

```
apps/web/
├── pages/                    # thin — route wiring + data fetching only
├── components/
│   ├── screens/              # page-level compositions, grouped by route
│   │   ├── editor/           #   e.g. editor/links-tab.tsx, editor/kyte-switcher.tsx
│   │   ├── onboarding/
│   │   └── auth/
│   └── …                     # shared components, flat kebab-case files
├── hooks/                    # use-*.ts, one hook per file
├── lib/                      # small single-purpose modules: api.ts, format.ts, time.ts
└── consts/                   # per-domain constants: themes.ts, icons.ts, limits.ts
```

- `lib/` files are small and focused (koala style: `time.ts`, `format.ts`, `audit.ts`) — no `utils.ts` grab-bag, no 500-line helper files.
- Shared-across-apps code goes in `packages/*`, never copy-pasted between apps.
- Hooks: `hooks/use-thing.ts`, one hook per file, named after what it returns.

## Comments

**Do not write comments.** Code must be self-explanatory through naming and small functions. The ONLY acceptable comments are for genuinely non-obvious constraints that code cannot express (a protocol quirk, a deliberate deviation, a security invariant like "raw token never stored"). No section banners, no "// fetch the user", no JSDoc on obvious functions, no commented-out code, no TODO litter (file an issue or fix it). Reviewers strike any comment that merely narrates the code.

## General style

- Strict TS; `any`/`@ts-ignore` are lint errors; `console.log` is a lint error (pino on the server, nothing in the client).
- Named exports over default exports (except Next pages which require default).
- zod-parse at boundaries; internal code trusts types.
- Match these conventions when in doubt; consistency beats preference.
