import { test, expect } from "./support/fixtures";
import type { Page } from "@playwright/test";
import { onboardFreshUser } from "./support/onboard";
import { openPublishMenu } from "./support/editor";

// The input-otp field auto-submits on the 6th digit (like the auth OTP). Fill
// the visible one-time-code input; if a submit button is still present, click it.
async function submitPasscode(page: Page, code: string): Promise<void> {
  const otp = page.locator('input[autocomplete="one-time-code"]');
  await otp.click();
  for (let i = 0; i < 8; i += 1) await page.keyboard.press("Backspace");
  await page.keyboard.type(code, { delay: 80 });
  const btn = page.getByRole("button", { name: "View draft" });
  if (await btn.isEnabled({ timeout: 1500 }).catch(() => false)) await btn.click().catch(() => undefined);
}

async function openPanel(page: Page): Promise<{ url: string; passcode: string; token: string }> {
  await openPublishMenu(page, /Preview link/);
  const url = await page.getByTestId("preview-url").inputValue();
  const passcode = await page.getByTestId("preview-passcode").inputValue();
  return { url, passcode, token: /\/p\/([A-Za-z0-9_-]+)/.exec(url)?.[1] ?? "" };
}

test.describe("preview link", () => {
  test("one link per kyte, passcode gate, one-click open, passcode reset", async ({
    page,
    context,
  }) => {
    await onboardFreshUser(page, context, "prev");

    await page.goto("/edit");
    await page.waitForURL(/\/edit/);
    const first = await openPanel(page);
    expect(first.passcode, "passcode shown up front").toMatch(/^\d{6}$/);
    expect(first.token, "token extracted").toBeTruthy();
    // Regression: exactly one origin, no concatenated base URLs (kytelink.com + web).
    expect(first.url, "single well-formed preview URL").toMatch(
      /^https?:\/\/[^/]+\/p\/[A-Za-z0-9_-]{12}$/,
    );
    await expect(page.getByRole("button", { name: "Create preview link" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    const again = await openPanel(page);
    expect(again.url).toBe(first.url);
    expect(again.passcode).toBe(first.passcode);
    await page.keyboard.press("Escape");

    const previewUrl = `/p/${first.token}`;

    await page.goto(previewUrl);
    await expect(page.getByRole("heading", { name: "This is a private draft" })).toBeVisible();
    await submitPasscode(page, first.passcode === "111111" ? "222222" : "111111");
    await expect(page.getByText(/Wrong or expired passcode/)).toBeVisible({ timeout: 10000 });

    await submitPasscode(page, first.passcode);
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Draft preview/)).toHaveCount(0);

    // The passcode in the query string unlocks straight away, then is dropped
    // from the address bar so it can't leak via the URL or a Referer header.
    await page.goto(`${previewUrl}?p=${first.passcode}`);
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`/p/${first.token}$`));

    await page.goto("/edit");
    await openPublishMenu(page, /Preview link/);
    await page.getByRole("button", { name: "Reset passcode" }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByTestId("preview-passcode")).not.toHaveValue(first.passcode, {
      timeout: 10000,
    });
    const rolled = await page.getByTestId("preview-passcode").inputValue();
    expect(await page.getByTestId("preview-url").inputValue()).toBe(first.url);

    await page.goto(previewUrl);
    await submitPasscode(page, first.passcode);
    await expect(page.getByText(/Wrong or expired passcode/)).toBeVisible({ timeout: 10000 });
    await submitPasscode(page, rolled);
    await expect(page.locator("[data-kytelink-profile-view]")).toBeVisible({ timeout: 10000 });
  });
});
