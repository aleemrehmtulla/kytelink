import { test, expect } from "./support/fixtures";

// Golden-path step: the SEO sitemap + robots are served from the web zone
// (H11). Runs against the real web app (:4000). The nightly sitemap worker is
// cron-scheduled and does not run during the gate, so this exercises the
// worker-hasn't-run fallback: a minimal but valid sitemap that lists the static
// marketing pages and never 500s.
test.describe("sitemap + robots (real stack)", () => {
  test("/sitemap.xml serves valid sitemap XML, never 500", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<?xml");
    expect(body).toMatch(/<(urlset|sitemapindex)\b/);
    // Either the fallback urlset (lists the static pages) or the worker-written
    // index (points at shard files) — both are valid at this URL.
    expect(body.includes("/features") || body.includes("<sitemapindex")).toBeTruthy();
  });

  test("a sitemap shard URL serves valid XML, never 500", async ({ page }) => {
    const res = await page.request.get("/sitemap-0.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/<(urlset|sitemapindex)\b/);
  });

  test("/robots.txt references the sitemap", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toMatch(/Sitemap:\s*\S+\/sitemap\.xml/);
  });
});
