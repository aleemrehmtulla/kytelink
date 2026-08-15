import { describe, expect, it } from "vitest";
import { brandOwningHost, extractHostname, findBrandLookalike, isPunycodeHost } from "./lookalike";

describe("extractHostname", () => {
  it("extracts a lowercase hostname", () => {
    expect(extractHostname("https://Example.COM/path")).toBe("example.com");
  });

  it("returns null for an unparseable url", () => {
    expect(extractHostname("not a url")).toBeNull();
  });

  it("returns null for a scheme with no host", () => {
    expect(extractHostname("tel:+18005552222")).toBeNull();
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

describe("brandOwningHost", () => {
  it.each([
    ["paypal.com", "PayPal"],
    ["www.att.com", "AT&T"],
    ["support.amazon.co.uk", "Amazon"],
    ["myclinic.com", null],
    ["paypal-secure.net", null],
  ])("resolves %s", (hostname, brand) => {
    expect(brandOwningHost(hostname)).toBe(brand);
  });
});

describe("findBrandLookalike — flags", () => {
  it.each([
    ["arnaz0n.com", "homoglyph_of:amazon"],
    ["paypa1.com", "homoglyph_of:paypal"],
    ["xn--pypal-4ve.com", "homoglyph_of:paypal"],
    ["paypall.com", "typosquat_of:paypal"],
    ["att-support.com", "brand_phish_host:att"],
    ["bell-billing.example.net", "brand_phish_host:bell"],
    ["paypal.com.secure-check.net", "brand_phish_host:paypal"],
  ])("%s", (hostname, pattern) => {
    expect(findBrandLookalike(hostname)?.pattern).toBe(pattern);
  });
});

describe("findBrandLookalike — leaves alone", () => {
  it.each([
    ["amazon.com"],
    ["support.att.com"],
    ["amazon.co.uk"],
    ["example.com"],
    ["belldental.ca"],
    ["belle.com"],
    ["finance.com"],
    ["krakens.com"],
    ["xn--mller-kva.de"],
    ["bellplumbing.example"],
  ])("%s", (hostname) => {
    expect(findBrandLookalike(hostname)).toBeNull();
  });
});
