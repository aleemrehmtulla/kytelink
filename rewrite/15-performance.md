# 15 — Performance: budgets + preloading

*Read this if: you're building web, landing, or the API. The Phase-4 performance critic measures every budget; a missed budget is a bug.*

## Budgets

| Surface | Budget |
|---|---|
| Profile page | TTFB <100ms (CDN static), LCP <1.0s on 4G, CLS = 0, **as little JS as Next allows: ≤10KB gz of route JS beyond the shared framework runtime; framer-motion / chart.js / dnd-kit / emoji-mart NEVER in this bundle (editor-only — CI bundle-analysis check enforces)** |
| Landing | Lighthouse ≥95 all categories, LCP <1.5s 4G, CLS = 0 |
| Editor | interactive <2s warm; keystroke→preview <16ms; tab switch <100ms; save <300ms perceived (optimistic) |
| API | tRPC reads p95 <50ms cached / <150ms uncached; beacon handler p99 <5ms; publish→CDN-fresh <10s; scheduled publish fires within 60s of target |
| Admin | dashboards p95 <500ms (rollups only) |

## Preload / prefetch plan (implement all)

1. `_document` (web + landing): `preconnect`/`dns-prefetch` to `NEXT_PUBLIC_CDN_URL` and the API origin; Inter preloaded via `next/font`.
2. Profile page: the avatar is the LCP — `<link rel="preload" as="image" fetchpriority="high">` + the LQIP inlined as a data URI at build time so first paint shows the blur with zero requests ([08-media.md](08-media.md)).
3. Landing → auth: CTAs use `next/link` viewport prefetch; auth bundles kept tiny.
4. Editor: one `kyte.get` round trip returns draft + published + role together; kyte switcher prefetches the member list on open; tab bundles code-split with prefetch on hover/idle; analytics data prefetched when the editor sits idle.
5. Optimistic UI for every editor mutation; rollback on error.
6. Beacons: `sendBeacon`, never awaited, never delaying `window.open` or navigation.
7. Transport: brotli, HTTP/2+, immutable caching for all bucket assets and `_next/static`.
8. The local-CDN package ([09-cdn.md](09-cdn.md)) serves owned assets from the same-origin CDN domain in prod — no third-party image hosts anywhere (kills their DNS/TLS cost and their failure modes).

## Scale posture (the Phase-4 scale reviewer's checklist seed)

Static profiles mean reads scale with the CDN, not the origin. Watch items: revalidation stampede on a celebrity publish (queue coalescing — dedupe identical paths in the revalidate queue); viral-profile beacon bursts (CH async inserts + Redis buffer absorb; rate limits protect); `KyteMember` fan-out queries (indexed by userId); ClickHouse partition growth (monthly parts; **raw events AND rollups kept forever — founder-confirmed; revisit manually if disk ever matters**); Redis memory (rate buckets TTL'd, caches bounded); BullMQ throughput at 1k publishes/min.
