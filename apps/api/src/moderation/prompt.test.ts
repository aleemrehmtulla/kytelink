import { describe, expect, it } from "vitest";
import { buildSnapshot } from "./fixtures";
import { MODERATION_SYSTEM_PROMPT, buildModerationUserContent } from "./prompt";

function textOf(parts: ReturnType<typeof buildModerationUserContent>): string {
  const first = parts[0];
  return first && first.type === "text" ? first.text : "";
}

describe("MODERATION_SYSTEM_PROMPT", () => {
  it("makes APPROVE the default verdict and low confidence an approval", () => {
    expect(MODERATION_SYSTEM_PROMPT).toContain("Your default verdict is APPROVE");
    expect(MODERATION_SYSTEM_PROMPT).toContain("below 0.8, return APPROVE");
    expect(MODERATION_SYSTEM_PROMPT).toContain("Manual reports are the backstop");
  });

  it("names exactly the two suspendable categories", () => {
    expect(MODERATION_SYSTEM_PROMPT).toContain("SUSPEND for exactly two things");
    expect(MODERATION_SYSTEM_PROMPT).toContain("telecom");
    expect(MODERATION_SYSTEM_PROMPT).toContain("Pornography");
  });

  it("asks the model to verify a brand claim against the brand's own domains", () => {
    expect(MODERATION_SYSTEM_PROMPT).toContain("BRAND AUTHENTICITY");
    expect(MODERATION_SYSTEM_PROMPT).toContain("Big companies are welcome on Kytelink");
    expect(MODERATION_SYSTEM_PROMPT).toContain("Never suspend this case");
    expect(MODERATION_SYSTEM_PROMPT).toContain("apple-support.com rather than apple.com");
  });

  it.each([
    "dental",
    "Crypto is not fraud",
    "free-mail address used as the contact",
    "spicy",
    "Link shorteners",
  ])("carries the %s carve-out", (phrase) => {
    expect(MODERATION_SYSTEM_PROMPT.toLowerCase()).toContain(phrase.toLowerCase());
  });
});

describe("buildModerationUserContent", () => {
  it("labels advisory signals as insufficient background", () => {
    const text = textOf(
      buildModerationUserContent(buildSnapshot(), {
        advisory: [{ key: "free_mail_owner", detail: "owner signed up with gmail.com" }],
      }),
    );
    expect(text).toContain("never sufficient on its own");
    expect(text).toContain("free_mail_owner: owner signed up with gmail.com");
  });

  it("says so when there is no advisory context", () => {
    expect(textOf(buildModerationUserContent(buildSnapshot()))).toContain(
      "advisory context (weak background, never sufficient on its own):\n(none)",
    );
  });

  it("renders the brand claim with its official domains and off-brand destinations", () => {
    const text = textOf(
      buildModerationUserContent(buildSnapshot({ displayName: "Rogers Support" }), {
        brandClaim: {
          brand: "Rogers",
          sector: "telecom",
          claim: "rogers support",
          field: "displayName",
          value: "Rogers Support",
          officialDomains: ["rogers.com"],
          offBrandDestinations: [{ url: "https://pay-now.example", pattern: "capture_path" }],
        },
      }),
    );

    expect(text).toContain("brand claim flagged: Rogers (telecom)");
    expect(text).toContain("Rogers's official domains: rogers.com");
    expect(text).toContain("https://pay-now.example (capture_path)");
  });

  it("says so when a brand-claiming page has no off-brand destination", () => {
    const text = textOf(
      buildModerationUserContent(buildSnapshot(), {
        brandClaim: {
          brand: "AT&T",
          sector: "telecom",
          claim: "at&t customer support",
          field: "displayName",
          value: "AT&T Customer Support",
          officialDomains: ["att.com"],
          offBrandDestinations: [],
        },
      }),
    );

    expect(text).toContain("every destination is on the official domains above");
  });

  it("attaches the avatar for the multimodal call", () => {
    const parts = buildModerationUserContent(
      buildSnapshot({ avatarUrl: "https://cdn.example/avatar.png" }),
    );
    expect(parts.at(-1)).toMatchObject({ type: "image_url" });
  });
});
