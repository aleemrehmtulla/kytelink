import { test, expect } from "./support/fixtures";
import { devLogin } from "./support/fixtures";

// A fresh @kytelink.dev identity has no org/kyte yet, so it lands in the wizard.
test.describe("onboarding to live", () => {
  test("fresh signup reaches a live page and the static profile is correct", async ({ page, context }) => {
    const stamp = Date.now().toString().slice(-8);
    const email = `e2e-onboard-${stamp}@kytelink.dev`;
    const slug = `e2e${stamp}`;
    await devLogin(context, email);

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Claim your link" })).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder("logan").fill(slug);
    const continueBtn = page.getByRole("button", { name: "Continue →" });
    await expect(continueBtn).toBeEnabled({ timeout: 10000 });
    await continueBtn.click();

    await expect(page.getByRole("heading", { name: "Add your name and photo" })).toBeVisible();
    await page.getByLabel("Name").fill("E2E Onboard User").catch(() => undefined);
    await page.getByRole("button", { name: "Continue →" }).click();

    await expect(page.getByRole("heading", { name: "Add a few links" })).toBeVisible();
    await page.getByRole("button", { name: "Go live 🎉" }).click();

    await expect(page.getByRole("heading", { name: "You're live!" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(`kytelink.com/${slug}`)).toBeVisible();

    await page.goto(`/${slug}`);
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveTitle(new RegExp(`\\| Kytelink`));
  });
});
