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

  test("/robots.txt allows AI crawlers on marketing pages only", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    const body = await res.text();
    expect(body).toContain("User-agent: GPTBot");
    const aiGroup = body.slice(body.indexOf("User-agent: GPTBot"));
    expect(aiGroup).toContain("User-agent: ClaudeBot");
    expect(aiGroup).toContain("User-agent: PerplexityBot");
    expect(aiGroup).toContain("Allow: /pricing$");
    expect(aiGroup).toContain("Allow: /llms.txt$");
    expect(aiGroup).toMatch(/^Disallow: \/$/m);
  });

  test("/robots.txt keeps user-initiated fetchers as visitors", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    const body = await res.text();
    const fetcherGroup = body.slice(
      body.indexOf("User-agent: ChatGPT-User"),
      body.indexOf("User-agent: GPTBot"),
    );
    expect(fetcherGroup).toContain("User-agent: Claude-User");
    expect(fetcherGroup).toContain("Allow: /");
    expect(fetcherGroup).toContain("Disallow: /edit");
  });

  test("/llms.txt serves a curated markdown index", async ({ page }) => {
    const res = await page.request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body.startsWith("# Kytelink")).toBeTruthy();
    expect(body).toContain("/pricing)");
    expect(body).toContain("/self-hosting)");
  });
});
