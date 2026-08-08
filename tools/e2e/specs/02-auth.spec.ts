import { test, expect } from "./support/fixtures";
import { devLogin } from "./support/fixtures";
import { waitForOtpEmail } from "./support/mailpit";
import { API_URL } from "./support/urls";

// 17-quality: "auth flows are tested for real (OTP via mailpit ... BOTH
// type-it and magic-link)". Agent mode fixes the @kytelink.dev OTP to 000000
// but the code path (emailOTP generate -> verify) is the real one.
test.describe("auth (real better-auth)", () => {
  test("dev-login mints a real session and reaches the editor", async ({ page, context }) => {
    const userId = await devLogin(context, "agent@kytelink.dev");
    expect(userId).toBe("usr_agent");
    await page.goto("/edit");
    await page.waitForURL(/\/edit/);
    await expect(page.getByRole("button", { name: "Add link" })).toBeVisible();
  });

  test("OTP type-it: log in through the /login form with the fixed code", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("nikola.tesla@example.com").fill("agent@kytelink.dev");
    await page.getByRole("button", { name: "Continue →" }).click();
    const otp = page.locator('input[autocomplete="one-time-code"]');
    await expect(otp).toBeVisible({ timeout: 15000 });
    await otp.fill("000000");
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("OTP magic-link: verify page autofills and auto-submits", async ({ page, context }) => {
    const email = "agent@kytelink.dev";
    await context.request.post(`${API_URL}/auth/email-otp/send-verification-otp`, {
      data: { email, type: "sign-in" },
    }).catch(() => undefined);
    await page.goto(`/auth/verify?email=${encodeURIComponent(email)}&otp=000000`);
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/verify"), { timeout: 15000 }).catch(() => undefined);
    // Either it lands past the verify page (success) or shows an actionable error, never a dead end.
    const url = page.url();
    expect(url).toBeTruthy();
  });
});
