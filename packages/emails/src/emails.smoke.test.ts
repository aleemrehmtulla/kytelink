import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EMAIL_FROM, readEmailConfig } from "./config";
import { createEmailProvider } from "./provider";
import { otpSubject, renderOtpEmail } from "./templates/otp-email";
import { renderKyteSuspendedEmail } from "./templates/kyte-suspended-email";
import { renderKyteRestoredEmail } from "./templates/kyte-restored-email";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("packages/emails provider", () => {
  it("defaults to console with the fallback from address", () => {
    const config = readEmailConfig({});
    expect(config.provider).toBe("console");
    expect(config.from).toBe(DEFAULT_EMAIL_FROM);
  });

  it("degrades resend to console without an API key (emailDelivery capability off)", () => {
    expect(readEmailConfig({ EMAIL_PROVIDER: "resend" }).provider).toBe("console");
  });

  it("selects resend when configured", () => {
    const config = readEmailConfig({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x" });
    expect(config.provider).toBe("resend");
  });

  it("console provider prints and reports delivered", async () => {
    const provider = createEmailProvider({ provider: "console", from: DEFAULT_EMAIL_FROM });
    const spy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const result = await provider.sendEmail({
      to: "agent@kytelink.dev",
      subject: otpSubject("123456"),
      html: "<p>123456</p>",
      text: "123456",
    });
    expect(result).toMatchObject({ provider: "console", delivered: true });
    expect(spy).toHaveBeenCalled();
  });
});

describe("packages/emails templates", () => {
  it("renders the OTP email to HTML + plaintext with subject and magic link", async () => {
    const { html, text } = await renderOtpEmail({
      otp: "123456",
      verifyUrl: "https://kytelink.com/auth/verify?email=a%40b.com&otp=123456",
    });
    expect(otpSubject("123456")).toBe("Your Kytelink login code: 123456");
    expect(html).toContain("123456");
    expect(html).toContain("auth/verify");
    expect(text).toContain("123456");
  });

  it("renders the kyte-restored email", async () => {
    const { html, text } = await renderKyteRestoredEmail({
      kyteUsername: "agent",
      profileUrl: "https://kytelink.com/agent",
    });
    expect(html).toContain("back online");
    expect(html).toContain("https://kytelink.com/agent");
    expect(text).toContain("live again");
  });

  it("renders the kyte-suspended email", async () => {
    const { html } = await renderKyteSuspendedEmail({
      kyteUsername: "agent",
      reason: "phishing links in bio",
      appealUrl: "https://kytelink.com/appeal?kind=kyte&handle=agent",
    });
    expect(html).toContain("suspended");
    expect(html).toContain("phishing links in bio");
    expect(html).toContain("/appeal");
  });

  it("console-prints a sample OTP through the console provider", async () => {
    const otp = "482913";
    const { html, text } = await renderOtpEmail({
      otp,
      verifyUrl: `https://kytelink.com/auth/verify?email=agent%40kytelink.dev&otp=${otp}`,
    });
    const provider = createEmailProvider({ provider: "console", from: DEFAULT_EMAIL_FROM });
    const result = await provider.sendEmail({
      to: "agent@kytelink.dev",
      subject: otpSubject(otp),
      html,
      text,
    });
    expect(result.delivered).toBe(true);
    expect(text).toContain(otp);
  });
});
