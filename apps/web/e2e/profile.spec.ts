import { test, expect } from "@playwright/test";

test.describe("public profile", () => {
  test("renders ProfileView content and parity SEO", async ({ page }) => {
    await page.goto("/agent");
    await expect(page).toHaveTitle("Agent | Kytelink");
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible();
    await expect(page.getByText("Building Kytelink in public. Follow along.")).toBeVisible();
    await expect(page.getByText("My newsletter")).toBeVisible();
    const watermark = page.locator('a[href*="?ref=agent"]');
    await expect(watermark).toBeVisible();
    await expect(watermark).toHaveText("kyte.");
  });

  test("unknown username is 404", async ({ page }) => {
    const response = await page.goto("/nobody-xyz-404");
    expect(response?.status()).toBe(404);
  });

  test("org-suspended profile shows the suspended shell with noindex", async ({ page }) => {
    await page.goto("/org-suspended-demo");
    await expect(page.getByRole("heading", { name: "This page is suspended" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("a suspended profile shows its reason and an appeal link", async ({ page }) => {
    await page.goto("/suspended-demo");
    await expect(page.getByRole("heading", { name: "This page is suspended" })).toBeVisible();
    await expect(page.getByText("Links pointed at a credential-harvesting page.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Appeal this suspension" })).toHaveAttribute(
      "href",
      /\/appeal\?kind=kyte&handle=suspended-demo/,
    );
  });
});
