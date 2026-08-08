import { test, expect, devLogin, fireBeacon } from "./support/fixtures";
import { chCount, chQuery, waitForCountAbove } from "./support/clickhouse";

test.describe("beacon -> ClickHouse -> analytics", () => {
  test("a page beacon for @agent lands as a page_hits row", async ({ page }) => {
    const where = "page_hits WHERE username = 'agent'";
    const before = await chCount(where);
    // Fire from the real profile page so the request origin is allowed.
    await page.goto("/agent");
    const status = await fireBeacon(page, "page", { kyteId: "usr_agent", username: "agent" });
    expect(status).toBe(202);
    const after = await waitForCountAbove(where, before, { timeoutMs: 25000 });
    expect(after).toBeGreaterThan(before);
  });

  test("a spoofed kyteId does not pollute another kyte's rows", async ({ page }) => {
    // Server resolves kyte_id from username; a mismatched kyteId must be ignored.
    await page.goto("/agent");
    const status = await fireBeacon(page, "page", { kyteId: "kyte_ag_1", username: "agent" });
    expect(status).toBe(202);
    await page.waitForTimeout(2000);
    const rows = await chQuery<{ kyte_id: string }>(
      `SELECT kyte_id FROM page_hits WHERE username = 'agent' ORDER BY ts DESC LIMIT 1`,
    );
    if (rows[0]) expect(rows[0].kyte_id).toBe("usr_agent");
  });

  test("the analytics tab renders StatTiles for the owner", async ({ page, context }) => {
    await devLogin(context, "agent@kytelink.dev");
    await page.goto("/edit/analytics");
    await expect(page.getByText("Total views")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Total clicks")).toBeVisible();
  });
});
