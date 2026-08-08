# 08 — Media: user-uploaded assets (R2 via S3)

*Read this if: you're building the assets stream, ProfileView image rendering, or migration. This doc covers **user uploads**; our own static assets are [09-cdn.md](09-cdn.md).*

## Naming rule

The S3 SDK everywhere. Env vars are `AWS_*` (`AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=auto, AWS_S3_BUCKET`) — hosted points at Cloudflare R2, docker-compose points at MinIO, and anyone can point at real AWS. Zero R2-specific API usage anywhere. Public base URL: `NEXT_PUBLIC_CDN_URL` (hosted: `https://cdn.kytelink.com` in front of the bucket).

**Uploads are an optional capability** ([25-selfhost.md](25-selfhost.md)): with no `AWS_*` config, the API boots with one warning and the entire image concept switches off — upload tiles hidden, onboarding offers only built-in default avatars (locally generated initials SVGs, no third party), profiles render clean without avatars, OG cards go text-only. Everything below assumes the capability is on.

## Key layout (strict)

```
u/{kyteId}/avatar/{ulid}.webp
u/{kyteId}/links/{ulid}.webp
u/{kyteId}/og/{contentHash}.png
static/…                     ← owned assets, managed by packages/cdn (09-cdn.md); never written here
```

Everything a kyte owns lives under `u/{kyteId}/` → storage accounting is `SUM(Asset.sizeBytes) GROUP BY kyteId` in Postgres; abuse cleanup is a prefix delete. (Migration sets kyteId = old userId, so this satisfies "user id as the folder" for all existing data.)

## Upload UX (crop first, real progress always)

1. **Crop/adjust step (required for every image upload):** picking a file opens a crop modal — zoom (pinch/wheel/slider), pan, and re-crop; fixed 1:1 aspect for avatars, free-with-square-default for link images (`react-easy-crop` or equivalent, touch-friendly). The user can reopen and readjust before saving. Canvas-exports the cropped region (max 2048px) so we upload the crop, not a 12MB original.
2. **Direct-to-bucket upload with real percentages:** `assets.createUploadUrl` → presigned PUT → upload via **XHR** (fetch has no upload progress) with `upload.onprogress` driving a real progress bar — actual bytes, never a fake spinner. States communicated in the UI: `Uploading — 43%` → `Optimizing…` (finalize running) → done (LQIP blur-up swaps to the final image). Cancellable mid-upload; failures offer retry with the crop preserved. Direct-to-bucket means upload bytes never touch our API server — zero server bandwidth per upload.

## Server pipeline (`assets.finalize(key)`)

EDITOR+ on that kyte, rate-limited; presigned PUT capped ≤10MB, content-type pinned.

1. HEAD + download the object; verify it's actually an image (magic bytes, not extension); `sharp({ limitInputPixels })` guards decompression bombs.
2. **One decode, all outputs:** a single sharp instance is cloned for each output — avatar → 512×512 webp (`effort: 4`, quality ~82); link images → ≤256px webp; **LQIP derived from the already-resized output, not the original** (`{ulid}.lqip.webp`, ~24px, a few hundred bytes). Both main and LQIP are real optimized encodes — no lazy passthroughs.
3. Compute width/height/`sizeBytes`; upload normalized + LQIP siblings; delete the raw upload; write the `Asset` row; draft references `avatarAssetId` (or the link's emoji field gets the new URL). The suffix convention means no extra DB column; `getLqipUrl(src)` — one small pure function in the cdn helper module, unit-tested, no special cases sprinkled elsewhere — derives any asset's LQIP URL.

**Efficiency (the hosted API runs on a render.com instance — decent compute, but we do all processing ourselves):** image work runs only in the `image-process` queue with concurrency capped at ~(cores − 1) (sharp is CPU-bound; unbounded parallel encodes stall the event loop and spike memory); finalize enqueues and returns fast, the UI's "Optimizing…" state covers the gap (p95 < 3s); buffers stay bounded (stream from bucket, never hold multiple originals in memory); oversized/corrupt files rejected before decode.

SSRF guard on any server-side fetch (deny private ranges, cap redirects).

`assets.createUploadUrl`/`finalize` reject while the kyte is SUSPENDED/BANNED ([06-api.md](06-api.md) suspension gate).

## Suspension quarantine (founder-confirmed)

When a kyte goes SUSPENDED/BANNED its images go dark too: the `asset-quarantine` worker moves every object under `u/{kyteId}/` to `q/{kyteId}/` (server-side copy + delete, idempotent, resumable); admin approve/unban moves them back and revalidates. `q/` is **never publicly readable** — self-host: the bucket policy scopes anonymous read to `static/*` + `u/*` (set in the compose MinIO bootstrap; standard S3 policy on AWS); hosted: a Cloudflare rule on `cdn.kytelink.com` blocks `/q/*` (one line in the launch runbook, [18-migration.md](18-migration.md)). `Asset.key` stays canonical (`u/…`) — the quarantine location is derived — so unsuspension is lossless and no schema changes are needed.

## Serving — zero layout shift, no image optimizer

- Public bucket behind `NEXT_PUBLIC_CDN_URL`, `Cache-Control: public, max-age=31536000, immutable` — keys contain ULIDs, safe to cache forever; a changed image is a new key.
- **No Vercel/Next image optimization.** Images are pre-sized server-side; render plain `<img>` with explicit `width`/`height` from the Asset row + CSS `aspect-ratio` + **LQIP blur-up** (the `.lqip.webp` sibling renders instantly under the full image; replaces the legacy 5px-jimp `blurpfp`). On the static profile page, inline the LQIP as a data URI at build time so the placeholder needs zero requests.
- The avatar is the profile page's LCP: preload it (`<link rel="preload" as="image" fetchpriority="high">` — [15-performance.md](15-performance.md)).
- **Per-profile OG images** (v1, founder-confirmed): the `og-image` worker renders a branded card (satori: avatar + name + @username on theme colors) at publish → `u/{kyteId}/og/{contentHash}.png` — contentHash-keyed so it's generated once per content version and cached forever; **the worker deletes the previous OG object + Asset row in the same job (founder-confirmed: OG images are replaced, never accumulated — exactly one OG asset per kyte at any time; it counts toward org storage like any asset)**; `<meta og:image>` points at it with explicit dimensions. **Readiness signal:** the worker writes an `OG_IMAGE` Asset row on completion and **enqueues a revalidate for that profile**; `getStaticProps` uses the OG card only when that Asset row exists, else the avatar — so a page built before the card lands ships the avatar and gets revalidated into the card automatically. At seed time ~25k OG jobs queue up: the worker must be running on the dark-deployed stack, and profiles are correct (avatar OG) in the meantime.

## Legacy data

Migration ([18-migration.md](18-migration.md)) downloads every legacy `pfp`/link-image URL (imagedelivery.net, supabase, cloudfront, i.ibb.co), runs it through the exact normalize pipeline above (exported as a shared module — the migration must import it, not copy it), uploads under the new keys, and rewrites references. Dead links → null avatar + a human-reviewed failure list.
