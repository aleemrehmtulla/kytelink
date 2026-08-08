import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("new user completes the publish-ASAP wizard", async ({ page }) => {
  await page.goto("/signup?persona=solo");
  await signIn(page, `new-${Date.now()}@kytelink.dev`);

  await expect(page.getByRole("heading", { name: "Claim your link" })).toBeVisible();
  const slug = `e2e${Date.now().toString().slice(-6)}`;
  await page.getByPlaceholder("logan").fill(slug);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled({ timeout: 5000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Add your name and photo" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Add a few links" })).toBeVisible();
  await page.getByRole("button", { name: "Go live", exact: true }).click();

  await expect(page.getByRole("heading", { name: "You're live!" })).toBeVisible();
  await expect(page.getByText(`kytelink.com/${slug}`)).toBeVisible();
});
