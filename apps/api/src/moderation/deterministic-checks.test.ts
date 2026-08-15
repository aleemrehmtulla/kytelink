import { describe, expect, it } from "vitest";
import {
  collectAdvisorySignals,
  findBrandClaim,
  findDeterministicHits,
} from "./deterministic-checks";
import { buildSnapshot } from "./fixtures";
import type { ModerationKyteSnapshot } from "./types";

type Overrides = Partial<ModerationKyteSnapshot>;

const APPROVED: Array<[string, Overrides]> = [
  ["an ordinary profile", {}],
  [
    "a dental clinic whose name contains a telecom word",
    {
      username: "belldental",
      displayName: "Bell Dental Clinic",
      description: "Family dentistry in Halifax — book a cleaning online.",
      links: [{ title: "Book", url: "https://belldental.ca/book" }],
    },
  ],
  [
    "a real company running its own support page",
    {
      displayName: "Acme AI",
      description: "Customer support for Acme AI customers.",
      links: [{ title: "Support", url: "https://acme.ai/support" }],
    },
  ],
  [
    "a customer-service account on a free-mail address",
    {
      displayName: "Sunrise Bakery",
      description: "Customer service: sunrisebakery@gmail.com",
      ownerEmailDomain: "gmail.com",
    },
  ],
  [
    "a school with a parent helpdesk",
    {
      displayName: "St Mary School",
      description: "Grades 1-8. Parent helpdesk open 9-5.",
    },
  ],
  [
    "a crypto link and nothing else",
    {
      displayName: "0xdegen",
      links: [{ title: "Buy", url: "https://pump.fun/coin/abc" }],
    },
  ],
  [
    "a spicy-but-not-explicit AI chat product",
    {
      displayName: "Spicy AI Companion",
      description: "Chat with your AI girlfriend.",
      links: [{ title: "Chat", url: "https://spicychat.example.com" }],
    },
  ],
  ["a link shortener", { links: [{ title: "Menu", url: "https://bit.ly/abc123" }] }],
  ["a shortener as the redirect target", { redirectUrl: "https://bit.ly/abc123" }],
  ["an unusual TLD", { links: [{ title: "Shop", url: "https://freegift.top/claim" }] }],
  [
    "an internationalised domain that is not a brand lookalike",
    { links: [{ title: "Shop", url: "https://xn--mller-kva.de/" }] },
  ],
  [
    "a brand mention without a support claim",
    {
      displayName: "Phone Repair Depot",
      description: "We fix Bell, Rogers and Telus handsets.",
      links: [{ title: "Book", url: "https://repairdepot.example/book" }],
    },
  ],
  [
    "the brand's own support kyte pointing at the brand's domain",
    {
      displayName: "AT&T Customer Support",
      links: [{ title: "Support", url: "https://www.att.com/support/" }],
    },
  ],
  [
    "a support claim with nowhere to send anyone",
    { displayName: "Rogers Support", links: [], description: "coming soon" },
  ],
  [
    "a telecom support page that could be the telecom itself",
    {
      displayName: "Rogers Support",
      links: [{ title: "Help", url: "https://example.com" }],
    },
  ],
  [
    "a telecom account-recovery claim with a phone number",
    {
      displayName: "Bell account recovery",
      description: "Refunds and reactivation — call 1-800-555-2222 now.",
      links: [],
    },
  ],
];

const FLAGGED: Array<[string, Overrides, string]> = [
  [
    "a capture domain built out of a telecom brand name",
    {
      displayName: "AT&T Customer Support",
      description: "Your account is suspended — verify now.",
      links: [{ title: "Verify", url: "https://att-verify.secure-login.net/verify" }],
    },
    "brand_lookalike",
  ],
  [
    "a page claiming Apple that links to apple-support.com",
    {
      displayName: "Apple ID Support",
      links: [{ title: "Verify", url: "https://apple-support.com/verify" }],
    },
    "brand_lookalike",
  ],
  [
    "an IP-grabber link",
    { links: [{ title: "Track", url: "https://grabify.link/xyz" }] },
    "ip_logger",
  ],
  [
    "a punycode homoglyph of a bank brand",
    { links: [{ title: "Login", url: "https://xn--pypal-4ve.com/login" }] },
    "brand_lookalike",
  ],
  [
    "a one-character typosquat of a bank brand as the redirect",
    { redirectUrl: "https://paypall.com/login" },
    "brand_lookalike",
  ],
];

describe("findDeterministicHits — stays quiet", () => {
  it.each(APPROVED)("finds nothing on %s", (_name, overrides) => {
    expect(findDeterministicHits(buildSnapshot(overrides))).toEqual([]);
  });
});

describe("findDeterministicHits — flags for AI confirmation", () => {
  it.each(FLAGGED)("flags %s", (_name, overrides, rule) => {
    const hits = findDeterministicHits(buildSnapshot(overrides));
    expect(hits).toHaveLength(1);
    expect(hits[0]?.rule).toBe(rule);
  });
});

describe("findBrandClaim — flags for AI verification, never a verdict", () => {
  it("flags a telecom support claim and hands over the brand's official domains", () => {
    const snapshot = buildSnapshot({
      displayName: "Rogers Customer Support",
      links: [{ title: "Verify", url: "https://account-help.example/verify" }],
    });

    expect(findDeterministicHits(snapshot)).toEqual([]);

    const claim = findBrandClaim(snapshot);
    expect(claim?.brand).toBe("Rogers");
    expect(claim?.claim).toBe("rogers customer support");
    expect(claim?.field).toBe("displayName");
    expect(claim?.officialDomains).toEqual(["rogers.com"]);
    expect(claim?.offBrandDestinations).toEqual([
      { url: "https://account-help.example/verify", pattern: "capture_path" },
    ]);
  });

  it("flags the brand's own page with no off-brand destination to hold against it", () => {
    const claim = findBrandClaim(
      buildSnapshot({
        displayName: "AT&T Customer Support",
        links: [
          { title: "Support", url: "https://www.att.com/support/" },
          { title: "Account", url: "https://att.com/my/account" },
        ],
      }),
    );

    expect(claim?.brand).toBe("AT&T");
    expect(claim?.offBrandDestinations).toEqual([]);
  });

  it("records the phone number a support scam wants people to call", () => {
    const claim = findBrandClaim(
      buildSnapshot({
        displayName: "Bell account recovery",
        description: "Call 1-800-555-2222 for refunds.",
        links: [],
      }),
    );

    expect(claim?.offBrandDestinations).toEqual([
      { url: "a phone number in the profile text", pattern: "phone_in_text" },
    ]);
  });

  it("stays null for a brand mentioned without a support claim", () => {
    expect(
      findBrandClaim(
        buildSnapshot({ displayName: "Phone Repair Depot — we fix Bell handsets" }),
      ),
    ).toBeNull();
  });
});

describe("findDeterministicHits — evidence for the model", () => {
  it("carries the pattern, the url, and the decoded punycode host", () => {
    const hit = findDeterministicHits(
      buildSnapshot({
        links: [{ title: "Login", url: "https://xn--pypal-4ve.com/login" }],
      }),
    )[0];

    expect(hit).toMatchObject({
      rule: "brand_lookalike",
      pattern: "homoglyph_of:paypal",
      url: "https://xn--pypal-4ve.com/login",
      kind: "link",
      brand: "PayPal",
    });
    expect(hit?.decodedHost).not.toBe("xn--pypal-4ve.com");
    expect(hit?.decodedHost).toContain("pal.com");
  });

  it("marks which side of the page the hit came from", () => {
    const hit = findDeterministicHits(
      buildSnapshot({ redirectUrl: "https://grabify.link/xyz" }),
    )[0];
    expect(hit).toMatchObject({
      rule: "ip_logger",
      kind: "redirect",
      pattern: "blocklist:grabify.link",
    });
  });

  it("leaves decodedHost off an ascii host", () => {
    const hit = findDeterministicHits(
      buildSnapshot({ links: [{ title: "x", url: "https://paypall.com/login" }] }),
    )[0];
    expect(hit?.decodedHost).toBeUndefined();
  });
});

describe("collectAdvisorySignals", () => {
  it("records free-mail, shortener, and brand mentions without a verdict", () => {
    const snapshot = buildSnapshot({
      displayName: "Bell Dental Clinic",
      description: "Customer support: belldental@gmail.com",
      links: [{ title: "Book", url: "https://bit.ly/booknow" }],
      ownerEmailDomain: "gmail.com",
    });

    expect(findDeterministicHits(snapshot)).toEqual([]);
    expect(collectAdvisorySignals(snapshot).map((signal) => signal.key)).toEqual([
      "brand_mention",
      "support_language",
      "url_shortener",
      "free_mail_owner",
    ]);
  });

  it("promotes a brand mention to brand_claim when the page claims the brand's desk", () => {
    const advisory = collectAdvisorySignals(
      buildSnapshot({
        displayName: "Rogers Support",
        links: [{ title: "Help", url: "https://example.com" }],
      }),
    );

    expect(advisory[0]?.key).toBe("brand_claim");
    expect(advisory[0]?.detail).toContain("rogers.com");
    expect(advisory.map((signal) => signal.key)).not.toContain("brand_mention");
  });

  it("stays empty for a plain profile", () => {
    expect(collectAdvisorySignals(buildSnapshot())).toEqual([]);
  });
});
