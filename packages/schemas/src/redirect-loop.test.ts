import { describe, expect, it } from "vitest";
import {
  isKytelinkProfileHost,
  isSelfRedirect,
  normalizeProfileHost,
  redirectTargetHost,
} from "./redirect-loop";

describe("isSelfRedirect", () => {
  it("catches the apex pointing at its own username", () => {
    expect(isSelfRedirect({ redirectUrl: "https://kytelink.com/agent", username: "agent" })).toBe(
      true,
    );
  });

  it("catches www, a trailing slash, mixed case, and a missing scheme", () => {
    for (const redirectUrl of [
      "https://www.kytelink.com/agent",
      "https://kytelink.com/agent/",
      "HTTPS://Kytelink.com/AGENT",
      "kytelink.com/agent",
      "http://kytelink.com/agent?ref=x",
    ]) {
      expect(isSelfRedirect({ redirectUrl, username: "Agent" })).toBe(true);
    }
  });

  it("catches every vanity alias of the same profile", () => {
    for (const host of ["kyte.bio", "kyte.lol", "yoyo.so", "downsad.com"]) {
      expect(isSelfRedirect({ redirectUrl: `https://${host}/agent`, username: "agent" })).toBe(true);
    }
  });

  it("catches a percent-encoded username segment", () => {
    expect(isSelfRedirect({ redirectUrl: "https://kytelink.com/a%67ent", username: "agent" })).toBe(
      true,
    );
  });

  it("allows a redirect to a different kyte", () => {
    expect(isSelfRedirect({ redirectUrl: "https://kytelink.com/other", username: "agent" })).toBe(
      false,
    );
  });

  it("allows external targets, the apex root, and unparseable values", () => {
    for (const redirectUrl of [
      "https://example.com/agent",
      "https://kytelink.com",
      "https://kytelink.com/",
      "mailto:agent@example.com",
      "   ",
      "http://",
    ]) {
      expect(isSelfRedirect({ redirectUrl, username: "agent" })).toBe(false);
    }
  });

  it("does not match a username that merely prefixes the segment", () => {
    expect(isSelfRedirect({ redirectUrl: "https://kytelink.com/agentic", username: "agent" })).toBe(
      false,
    );
  });
});

describe("host helpers", () => {
  it("normalizes case, port, and www", () => {
    expect(normalizeProfileHost("WWW.Kytelink.com:3000")).toBe("kytelink.com");
  });

  it("recognizes the apex and vanity hosts only", () => {
    expect(isKytelinkProfileHost("www.kytelink.com")).toBe(true);
    expect(isKytelinkProfileHost("kyte.bio")).toBe(true);
    expect(isKytelinkProfileHost("links.acme.com")).toBe(false);
  });

  it("reports the normalized target host of a redirect", () => {
    expect(redirectTargetHost("Links.Acme.com/anything")).toBe("links.acme.com");
    expect(redirectTargetHost("https://www.links.acme.com")).toBe("links.acme.com");
    expect(redirectTargetHost("   ")).toBeNull();
  });
});
