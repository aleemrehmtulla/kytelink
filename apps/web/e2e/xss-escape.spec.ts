import { test, expect } from "@playwright/test";

// B1 regression: a displayName of `</script><script>…</script>` must NOT break
// out of the JSON-LD <script> tag and execute. The xss-demo fixture carries
// exactly that payload.
test.describe("JSON-LD stored-XSS guard", () => {
  test("a </script> in displayName is escaped, not executed", async ({ page }) => {
    const flagged: unknown[] = [];
    await page.exposeFunction("__reportXss", (v: unknown) => flagged.push(v));

    await page.goto("/xss-demo");
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible();

    // The injected payload sets window.__xss__ if it ever executes.
    const executed = await page.evaluate(() => (window as unknown as { __xss__?: number }).__xss__);
    expect(executed).toBeUndefined();

    const ldJson = await page.locator('script[type="application/ld+json"]').innerText();
    expect(ldJson).toContain("\\u003c/script\\u003e");
    expect(ldJson).not.toContain("</script>");
    const parsed = JSON.parse(ldJson) as { mainEntity: { name: string } };
    expect(parsed.mainEntity.name).toBe("</script><script>window.__xss__=1</script>");
    expect(flagged).toHaveLength(0);
  });
});
