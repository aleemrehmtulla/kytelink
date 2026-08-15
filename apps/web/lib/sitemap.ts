import { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import { publicWebUrl } from "./env";

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
  const body = STATIC_SITEMAP_PATHS.map(
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
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
