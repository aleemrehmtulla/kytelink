import { describe, expect, it } from "vitest";
import { extractHostname, findBrandLookalikeToken, isPunycodeHost } from "./lookalike";

describe("extractHostname", () => {
  it("extracts a lowercase hostname", () => {
    expect(extractHostname("https://Example.COM/path")).toBe("example.com");
  });

  it("returns null for an unparseable url", () => {
    expect(extractHostname("not a url")).toBeNull();
  });
});

describe("isPunycodeHost", () => {
  it("detects a punycode-encoded label", () => {
    expect(isPunycodeHost("xn--pypal-4ve.com")).toBe(true);
  });

  it("returns false for an ordinary hostname", () => {
    expect(isPunycodeHost("paypal.com")).toBe(false);
  });
});

describe("findBrandLookalikeToken", () => {
  it("flags a homoglyph substitution of a brand domain", () => {
    expect(findBrandLookalikeToken("arnaz0n.com")).toBe("amazon");
  });

  it("flags a single-character-off lookalike of a brand domain", () => {
    expect(findBrandLookalikeToken("paypaI.com")).toBe("paypal");
  });

  it("does not flag the real brand domain", () => {
    expect(findBrandLookalikeToken("amazon.com")).toBeNull();
  });

  it("does not flag an unrelated domain", () => {
    expect(findBrandLookalikeToken("example.com")).toBeNull();
  });
});
