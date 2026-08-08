import { test, expect } from "@playwright/test";
import { decideForeignHost, isVanityHost, normalizeHost } from "../lib/host-routing";

// M1 + M6 unit-level regression for the pure routing decision. Runs in the
// Playwright node context (no browser) so the fail-OPEN branch — which only
// triggers on a real API failure — is exercised deterministically.
test.describe("decideForeignHost", () => {
  test("vanity root redirects, vanity path serves", () => {
    expect(
      decideForeignHost({ host: "kyte.bio", isRoot: true, lookup: { ok: true, username: null }, cachedUsername: null }),
    ).toEqual({ kind: "redirect-landing" });
    expect(
      decideForeignHost({ host: "kyte.lol", isRoot: false, lookup: { ok: true, username: null }, cachedUsername: null }),
    ).toEqual({ kind: "serve-path" });
  });

  test("custom domain with a known owner rewrites to the profile", () => {
    expect(
      decideForeignHost({
        host: "links.acme.com",
        isRoot: true,
        lookup: { ok: true, username: "acme" },
        cachedUsername: null,
      }),
    ).toEqual({ kind: "rewrite-profile", username: "acme" });
  });

  test("custom domain with no owner redirects to landing", () => {
    expect(
      decideForeignHost({
        host: "unknown.example",
        isRoot: true,
        lookup: { ok: true, username: null },
        cachedUsername: null,
      }),
    ).toEqual({ kind: "redirect-landing" });
  });

  test("FAIL OPEN: lookup error + cached owner still serves the profile", () => {
    expect(
      decideForeignHost({
        host: "links.acme.com",
        isRoot: true,
        lookup: { ok: false },
        cachedUsername: "acme",
      }),
    ).toEqual({ kind: "rewrite-profile", username: "acme" });
  });

  test("lookup error with a cold cache falls back to landing", () => {
    expect(
      decideForeignHost({
        host: "links.acme.com",
        isRoot: true,
        lookup: { ok: false },
        cachedUsername: null,
      }),
    ).toEqual({ kind: "redirect-landing" });
  });

  test("host normalization strips port and www", () => {
    expect(normalizeHost("WWW.Kyte.Bio:3000")).toBe("kyte.bio");
    expect(isVanityHost("www.kyte.lol")).toBe(true);
    expect(isVanityHost("kytelink.com")).toBe(false);
  });
});
