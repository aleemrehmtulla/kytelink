import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, email: string): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("nikola.tesla@example.com").fill(email);
  const otp = page.locator('input[autocomplete="one-time-code"]');
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await expect(async () => {
    await continueButton.click();
    await expect(otp).toBeAttached({ timeout: 1500 });
  }).toPass({ timeout: 25000 });
  await otp.fill("000000");
  await page.waitForURL((url) => !url.pathname.startsWith("/login") && !url.pathname.startsWith("/signup"), {
    timeout: 15000,
  });
}

export async function signInFresh(page: Page, email: string, persona: "solo" | "team" = "solo"): Promise<void> {
  await page.goto(`/login?persona=${persona}`);
  await signIn(page, email);
}

export async function expectNoOrgJargon(page: Page): Promise<void> {
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("organization");
  expect(body).not.toContain("workspace");
}
