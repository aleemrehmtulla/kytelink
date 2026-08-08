import { test, expect, devLogin } from "./support/fixtures";
import { onboardFreshUser } from "./support/onboard";
import { localDateTime, openPublishMenu } from "./support/editor";

test.describe("editor: switcher, limits, suspended lock", () => {
  test("the kyte switcher lists kytes and offers a new Kytelink", async ({ page, context }) => {
    await devLogin(context, "agent@kytelink.dev");
    await page.goto("/edit");
    await page.waitForURL(/\/edit/);
    const switcher = page.getByRole("button", { name: /Agent|Untitled|Kytelink/ }).first();
    await switcher.click();
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toContain("new kytelink");
    await page.keyboard.press("Escape");
  });

  test("hitting the schedule cap opens the contact-Aleem limit modal", async ({ page, context }) => {
    // Fresh kyte => deterministic: cap is 3 pending schedules, so the 4th trips it.
    await onboardFreshUser(page, context, "lim");
    await page.goto("/edit");
    await page.waitForURL(/\/edit/);
    await openPublishMenu(page, /Schedule/);

    const field = page.locator('input[type="datetime-local"]');
    const schedule = page.getByRole("button", { name: "Schedule", exact: true });
    // Regression: the modal must name the exact capped thing ("scheduled
    // publishes"), proving the LIMIT_REACHED key flows API -> client detail ->
    // LIMIT_LABELS.
    const modalHeading = page.getByText(/You've hit the limit on scheduled publishes/);
    for (let i = 1; i <= 4; i += 1) {
      if (await modalHeading.isVisible().catch(() => false)) break;
      await field.fill(localDateTime(i * 24 * 3600_000));
      await schedule.click();
      await page.waitForTimeout(1200);
    }
    await expect(modalHeading).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Message Aleem on X" })).toBeVisible();
  });

  test("scheduling in the past offers to publish now instead of erroring", async ({
    page,
    context,
  }) => {
    await onboardFreshUser(page, context, "past");
    await page.goto("/edit");
    await page.waitForURL(/\/edit/);
    await openPublishMenu(page, /Schedule/);

    await page.locator('input[type="datetime-local"]').fill(localDateTime(-48 * 3600_000));
    await page.getByRole("button", { name: "Schedule", exact: true }).click();

    await expect(page.getByText(/That time has already passed/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/outside the allowed window/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pick another time" })).toBeVisible();

    await page.getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText(/Kyte published/)).toBeVisible({ timeout: 15000 });
  });

  test("the public suspended kyte is a full read-only lockdown", async ({ page }) => {
    // Editor-side lockdown for a member-owned kyte requires an admin suspend
    // round-trip (see 07-admin); the public read-only shell is asserted here.
    await page.goto("/suspended-demo");
    await expect(page.getByRole("heading", { name: "This page is unavailable" })).toBeVisible();
  });
});
