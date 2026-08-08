import { test, expect, devLogin } from "./support/fixtures";
import { ADMIN_URL } from "./support/urls";

test.describe("admin app (real stack)", () => {
  test.beforeEach(async ({ context }) => {
    await devLogin(context, "agent-admin@kytelink.dev");
  });

  test("Live view renders the realtime tiles", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/live`);
    await expect(page.getByRole("heading", { name: "Live" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Signups today")).toBeVisible();
  });

  test("Moderation queue lists suspended kytes", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/moderation`);
    await expect(page.getByRole("heading", { name: "Moderation queue" })).toBeVisible({
      timeout: 20000,
    });
    // Ban is gone: the queue is scoped by what took the page down (kyte or org),
    // and the only reversal offered on a row is Restore.
    await expect(page.getByLabel("Filter by what took the kyte down")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ban", exact: true })).toHaveCount(0);
    // The seed ships a suspended kyte, so the queue is non-empty.
    await expect(page.getByRole("button", { name: "Restore", exact: true }).first()).toBeVisible();
  });

  test("Reports offer suspend or dismiss, never ban", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/moderation/reports`);
    await expect(page.getByRole("heading", { name: "Abuse reports" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByLabel("Filter reports by reason")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ban kyte" })).toHaveCount(0);
  });

  test("Appeals has its own page under Moderation", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/moderation/appeals`);
    await expect(page.getByRole("heading", { name: "Appeals" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel("Filter appeals by status")).toBeVisible();
  });

  test("the case modal opens a case rather than a ban", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/moderation?case=new`);
    await expect(page.getByRole("heading", { name: "Find the account" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText("Nothing gets suspended until the right account is on screen")).toBeVisible();
  });

  test("a non-admin cannot reach the admin app", async ({ page, context }) => {
    await context.clearCookies();
    await devLogin(context, "agent@kytelink.dev");
    const res = await page.goto(`${ADMIN_URL}/overview`);
    const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    expect(res?.status() === 200 ? !body.includes("signups today") : true).toBeTruthy();
  });
});
