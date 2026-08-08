import { test, expect } from "./support/fixtures";

test.describe("public profile (real stack)", () => {
  test("renders ProfileView, parity SEO, and the growth watermark", async ({ page }) => {
    await page.goto("/agent");
    await expect(page).toHaveTitle(/Agent \| Kytelink/);
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible();
    const watermark = page.locator('a[href*="?ref=agent"]');
    await expect(watermark).toBeVisible();
    await expect(watermark).toHaveText("made with kytelink");
  });

  test("unknown username is a hard 404", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-real-kyte-404");
    expect(res?.status()).toBe(404);
  });

  test("a redirect kyte serves an HTTP redirect to its target", async ({ page }) => {
    // Assert at the HTTP level (no external navigation — the target is offsite
    // and unreachable from the sandbox). getStaticProps returns a redirect.
    const res = await page.request.get("/gothere", { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toContain("example.com");
  });

  test("a suspended kyte shows the suspended shell with an appeal link", async ({ page }) => {
    await page.goto("/suspended-demo");
    await expect(page.getByRole("heading", { name: "This page is suspended" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByText(/Automated sweep flagged spam links/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Appeal this suspension" })).toHaveAttribute(
      "href",
      /\/appeal\?kind=kyte&handle=suspended-demo/,
    );
  });

  // Org-scoped: the kyte's own verdict is APPROVED and the suspension is
  // inherited from its organization, so this asserts the EFFECTIVE status.
  test("an org-suspended kyte shows the same shell with noindex", async ({ page }) => {
    await page.goto("/org-suspended-demo");
    await expect(page.getByRole("heading", { name: "This page is suspended" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
