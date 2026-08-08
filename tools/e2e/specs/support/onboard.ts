import { expect, type BrowserContext, type Page } from "@playwright/test";
import { devLogin } from "./fixtures";

/**
 * dev-login a brand-new @kytelink.dev identity and take it through the
 * onboarding wizard to a live kyte. Returns the claimed slug/email so callers
 * operate on a clean, dedicated kyte (no shared-state coupling between specs).
 */
export async function onboardFreshUser(
  page: Page,
  context: BrowserContext,
  prefix = "e2e",
): Promise<{ email: string; slug: string }> {
  const stamp = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
  const email = `${prefix}-${stamp}@kytelink.dev`;
  const slug = `${prefix}${stamp}`.replace(/[^a-z0-9]/g, "").slice(0, 20);
  await devLogin(context, email);

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Claim your link" })).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder("logan").fill(slug);
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 10000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Add your name and photo" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Add a few links" })).toBeVisible();
  await page.getByRole("button", { name: "Go live" }).click();
  await expect(page.getByRole("heading", { name: "You're live!" })).toBeVisible({ timeout: 20000 });
  return { email, slug };
}
