# 09 — `packages/cdn`: our owned assets (local CDN + build-time R2 sync)

*Read this if: you're building the scaffold, landing, web, admin, or emails. This doc covers **our** assets (logos, landing imagery, email images, favicons, OG images). User uploads are [08-media.md](08-media.md) and do NOT go through this package.*

> This pattern is ported from another production monorepo (barberflow). That repo is not available to you — this doc is the complete, self-contained spec.

## The idea

All brand/marketing/static assets live **in the repo**, in one package, organized by purpose. In dev, a tiny static server hosts them at `http://localhost:5002` — drop a file in the folder and it's instantly visible on localhost. On deploy (main branch), a sync step diffs the folder against the R2 bucket and uploads what changed. One helper function resolves keys to the right base URL per environment. Result: no manual bucket uploads ever, no "works locally but 404s in prod", and the landing agent can add imagery by just committing files.

## Package layout

```
packages/cdn/
├── assets/                  # THE content — every owned static asset, by purpose
│   ├── logos/               #   icon.svg, full.svg, dark/…
│   ├── landing/             #   hero media, feature illustrations, example avatars
│   ├── seo/                 #   favicon.ico, favicon.svg, apple-touch-icon.png,
│   │                        #   og-image.png, web-app-manifest-{192,512}.png, site.webmanifest
│   ├── email/               #   logo + icons referenced by React Email templates
│   ├── brand/               #   aleem.png for the limit modal (source once from
│   │                        #   https://aleemrehmtulla.com/img/aleem/lisbon.png at scaffold)
│   └── themes/              #   the 9 theme preview thumbnails (currently hosted on i.ibb.co — bring them in-repo!)
├── src/index.ts             # getCdnUrl + getLqipUrl helpers (exported; re-exported via packages/ui)
├── s3-syncer.json           # sync config (below)
└── package.json             # scripts: dev, sync
```

```jsonc
// package.json scripts
{
  "dev":  "serve assets -l 5002",   // local CDN — wired into `pnpm dev` at the root so it always runs
  "sync": "s3-syncer sync"          // build/deploy-time upload
}
```

## Sync (`s3-syncer.json`)

Use the public `@maydotinc/s3-syncer` npm package if it's available and suitable; otherwise implement an equivalent ~150-line script in this package with the AWS SDK (list local files → content-hash fingerprint → compare remote metadata → upload changed, with concurrency + retries). Config shape (mirroring the proven setup):

```jsonc
{
  "targets": [{
    "directory": "assets",
    "bucket": "${AWS_S3_BUCKET}",
    "region": "auto",
    "endpoint": "${AWS_ENDPOINT_URL}",
    "prefix": "static",                      // ← owned assets land under static/ in the bucket
    "exclude": [],                           // user uploads live under u/ and are untouched anyway
    "delete": false,                         // NEVER delete remotely — additive-only for safety
    "accessKeyId": "${AWS_ACCESS_KEY_ID}",
    "secretAccessKey": "${AWS_SECRET_ACCESS_KEY}",
    "concurrency": { "fingerprint": 8, "upload": 4 },
    "retry": { "maxAttempts": 3, "baseDelayMs": 250, "maxDelayMs": 4000 },
    "maxFileSize": { "warnBytes": 25000000, "errorBytes": 100000000 }
  }],
  "branch": "main"                           // sync runs only from main (CI deploy step)
}
```

CI: the deploy pipeline runs `pnpm --filter cdn sync` before the app builds on main. Local `pnpm sync` also works for a manual push. Self-hosters get the same flow against their own bucket (MinIO in compose is pre-seeded by running sync once at bootstrap).

## The URL helper (`getCdnUrl`)

```ts
// packages/cdn/src/index.ts — sketch, implement cleanly
const LOCAL = 'http://localhost:5002';
const REMOTE = process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.kytelink.com';
const REMOTE_ONLY_PREFIXES = ['u/'];        // user uploads never exist locally

export function getCdnUrl(key: string, opts?: { version?: string | number }): string {
  // absolute URLs pass through; remote-only keys always resolve to REMOTE;
  // dev resolves owned keys to LOCAL, prod to REMOTE + the static/ prefix;
  // optional ?v= cache-buster for mutable-ish files (og-image after a redesign).
}
```

Rules:

- **Every owned-asset reference in every app and email template goes through `getCdnUrl`** — no hardcoded bucket URLs, no files in Next `public/` except what Next itself requires (`favicon` redirects fine from `seo/`).
- `u/` (user uploads) is remote-only: components render upload URLs straight from Asset rows ([08-media.md](08-media.md)); `getCdnUrl` just passes them through in dev too.
- Keys in code are written **without** the `static/` prefix (the helper adds it in prod; the local server's root is `assets/` so dev matches naturally).
- Version param: default none (immutable filenames preferred — `hero-v2.png` beats `?v=`); the option exists for genuinely-replaced files like `og-image.png`.

## Migration note

The 9 theme thumbnails and the landing example avatars currently live on third-party hosts (`i.ibb.co`, imagedelivery) — copy them into `assets/themes/` and `assets/landing/` during the build so nothing on our pages loads from a host we don't control.
