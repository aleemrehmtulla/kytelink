import { describe, expect, it } from "vitest";
import { LANDING_ROUTES } from "./landing-routes";
import {
  isReservedUsername,
  RESERVED_USERNAMES,
  USERNAME_REGEX,
  usernameSchema,
  validateUsername,
} from "./username";

describe("validateUsername", () => {
  it("accepts a simple lowercase username", () => {
    expect(validateUsername("aleem")).toEqual({ ok: true, username: "aleem" });
  });

  it("accepts hyphen, underscore, and digits", () => {
    expect(validateUsername("a-b_c123")).toEqual({ ok: true, username: "a-b_c123" });
  });

  it("lowercases before validating", () => {
    expect(validateUsername("Aleem")).toEqual({ ok: true, username: "aleem" });
  });

  it("rejects empty", () => {
    expect(validateUsername("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects too long (>30)", () => {
    expect(validateUsername("a".repeat(31))).toEqual({ ok: false, reason: "too_long" });
  });

  it("rejects invalid characters", () => {
    expect(validateUsername("bad name")).toEqual({ ok: false, reason: "invalid_chars" });
    expect(validateUsername("slash/slash")).toEqual({ ok: false, reason: "invalid_chars" });
  });

  it("accepts an interior dot", () => {
    expect(validateUsername("edward.airia")).toEqual({ ok: true, username: "edward.airia" });
    expect(validateUsername("Dr.Razon")).toEqual({ ok: true, username: "dr.razon" });
  });

  it("rejects dot placements that would confuse path handling", () => {
    expect(validateUsername(".hidden")).toEqual({ ok: false, reason: "unsafe_dot" });
    expect(validateUsername("trailing.")).toEqual({ ok: false, reason: "unsafe_dot" });
    expect(validateUsername("a..b")).toEqual({ ok: false, reason: "unsafe_dot" });
  });

  it("rejects a username that would read as a served file", () => {
    for (const name of ["site.json", "logo.png", "robots.txt", "app.js", "feed.xml"]) {
      expect(validateUsername(name)).toEqual({ ok: false, reason: "unsafe_dot" });
    }
  });

  it("rejects reserved usernames", () => {
    expect(validateUsername("admin")).toEqual({ ok: false, reason: "reserved" });
    expect(validateUsername("edit")).toEqual({ ok: false, reason: "reserved" });
  });

  it("sources reserved names from the shared landing-routes const", () => {
    for (const route of LANDING_ROUTES) {
      expect(RESERVED_USERNAMES.has(route)).toBe(true);
    }
  });

  it("usernameSchema parses and rejects consistently", () => {
    expect(usernameSchema.parse("Cool_User")).toBe("cool_user");
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("reserves the error routes so /404 and /500 can never resolve to a profile", () => {
    for (const route of ["404", "500"]) {
      expect(validateUsername(route)).toEqual({ ok: false, reason: "reserved" });
    }
  });

  it("reserves every zone route, including the landing-only pages", () => {
    const routes = [
      "features",
      "use-cases",
      "pricing",
      "discover",
      "legal",
      "terms-of-service",
      "privacy-policy",
      "anti-phishing",
      "self-hosting",
      "report",
      "onboarding",
      "orgs",
      "home",
      "edit",
      "account",
      "invites",
    ];
    for (const route of routes) {
      expect(validateUsername(route)).toEqual({ ok: false, reason: "reserved" });
    }
  });

  it("reserves the impersonation surfaces the anti-phishing policy calls out", () => {
    for (const name of ["support", "help", "security", "verify", "recovery", "billing", "admin"]) {
      expect(validateUsername(name)).toEqual({ ok: false, reason: "reserved" });
    }
  });

  it("reserves infrastructure and brand names", () => {
    for (const name of ["www", "cdn", "api", "mail", "status", "kytelink", "kyte"]) {
      expect(validateUsername(name)).toEqual({ ok: false, reason: "reserved" });
    }
  });

  it("still lets ordinary handles through", () => {
    for (const name of ["aleem", "maya-chen", "band_2026", "coffee", "studio99"]) {
      expect(validateUsername(name)).toEqual({ ok: true, username: name });
    }
  });

  it("isReservedUsername normalizes before checking", () => {
    expect(isReservedUsername("  ADMIN ")).toBe(true);
    expect(isReservedUsername("Support")).toBe(true);
    expect(isReservedUsername("aleem")).toBe(false);
  });

  it("holds every reserved name to the username format, so none are unreachable", () => {
    for (const name of RESERVED_USERNAMES) {
      // sitemap.xml / robots.txt are real routes that the format rejects anyway.
      if (name.includes(".")) continue;
      expect(USERNAME_REGEX.test(name)).toBe(true);
    }
  });
});
