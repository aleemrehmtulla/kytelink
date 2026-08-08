import { publicWebUrl } from "./env";

// The static marketing surface listed in the sitemap (16-seo.md). Mirrors the
// api sitemap worker's STATIC_MARKETING_PATHS; kept in sync by hand because
// apps/web must not import from apps/api.
const STATIC_MARKETING_PATHS = [
  "/",
  "/features",
  "/use-cases",
  "/pricing",
  "/legal",
  "/terms-of-service",
  "/privacy-policy",
];

function cdnBase(): string {
  return (process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.kytelink.com").replace(/\/+$/, "");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Minimal, always-valid sitemap served when the worker has not yet written the
// real one to the bucket. Lists only the static marketing pages so /sitemap.xml
// is never empty and never 500s.
export function minimalSitemapXml(): string {
  const base = publicWebUrl().replace(/\/+$/, "");
  const body = STATIC_MARKETING_PATHS.map(
    (p) => `  <url><loc>${escapeXml(`${base}${p}`)}</loc></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function emptyUrlsetXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
}

// Fetches a sitemap object the api worker wrote to the asset bucket
// (sitemaps/sitemap.xml — the index; sitemaps/sitemap-N.xml — the URL files).
// Returns null when the object is absent (worker hasn't run yet) or unreachable
// so the caller falls back to a minimal valid document rather than erroring.
export async function fetchSitemapObject(name: string): Promise<string | null> {
  const url = `${cdnBase()}/sitemaps/${name}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
