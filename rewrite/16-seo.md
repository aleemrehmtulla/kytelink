# 16 — SEO

*Read this if: you're building web, landing, or the sitemap worker.*

- **next-seo** across all three Next apps with a shared `DefaultSeo` in `packages/ui`.
- **Profile pages (parity + upgrades):** title `seoTitle || "{displayName || username} | Kytelink"` (`displayName` is the legacy `name` field renamed — [03-database.md](03-database.md); the "| Kytelink" casing is the legacy string preserved verbatim for parity); description `seoDescription || "Check out {displayName}'s kyte to grab their links!"`; canonical **always `https://kytelink.com/{username}`** (founder-confirmed, incl. custom domains); OpenGraph + Twitter card using the **generated per-profile OG image** ([08-media.md](08-media.md) — satori card at publish, contentHash-keyed and cached forever; avatar as fallback) with explicit dimensions; JSON-LD `ProfilePage`/`Person` with `sameAs` from icon URLs. Suspended/banned/404 and `/preview/*`: `noindex`.
- **Landing (all pages — home, features, use cases, legal):** unique title/description/OG per page (feature OGs from `packages/cdn` `seo/`), JSON-LD `WebSite` + `Organization` (+ legal-document JSON-LD on `/legal`, `/terms-of-service`, `/privacy-policy`), semantic headings, image alts. Feature and use-case pages are the SEO surface area — treat their metadata as first-class, not boilerplate.
- **robots.txt + sitemap:** nightly worker generates a sitemap index from published + APPROVED kytes (50k URLs/file) **plus the static marketing pages** (home, features, use cases, legal), stores in the bucket, served via rewrite. Admin app: noindex + disallow all.
- **Favicons/manifest:** the full set lives in `packages/cdn` `assets/seo/` ([09-cdn.md](09-cdn.md)).
- Core Web Vitals are part of the SEO story: static CDN delivery + CLS 0 ([15-performance.md](15-performance.md)) is the ranking asset.
