import { describe, expect, it } from "vitest";
import {
  coerceColor,
  coerceFont,
  coerceTheme,
  isLegacyAssetUrl,
  mapAccount,
  mapKyteContent,
  personalOrgName,
  planUsernames,
  planUsers,
} from "./mapping";
import {
  CLOUDFRONT_PFP,
  DEAD_IBB_PFP,
  IMAGEDELIVERY_PFP,
  SUPABASE_PFP,
  type LegacyAccountRow,
  type LegacyKyteRow,
  type LegacyUserRow,
} from "./legacy-fixture-data";

function kyte(row: Partial<LegacyKyteRow> & { userId: string }): LegacyKyteRow {
  return {
    email: null,
    createdAt: "2023-01-01T00:00:00.000Z",
    username: null,
    banned: false,
    name: null,
    description: null,
    pfp: null,
    theme: "default",
    customFont: "default",
    customColor: "default",
    seoTitle: null,
    seoDescription: null,
    links: [],
    icons: [],
    vcf: null,
    redirectLink: null,
    shouldRedirect: false,
    blurpfp: null,
    ...row,
  };
}

function user(row: Partial<LegacyUserRow> & { id: string }): LegacyUserRow {
  return {
    name: null,
    email: `${row.id}@x.test`,
    emailVerified: null,
    image: null,
    legacy: false,
    setup: true,
    ...row,
  };
}

describe("coercion", () => {
  it("keeps valid theme/font/color and coerces unknowns", () => {
    expect(coerceTheme("dark")).toEqual({ value: "dark", coerced: false });
    expect(coerceTheme("neon")).toEqual({ value: "default", coerced: true });
    expect(coerceTheme(null)).toEqual({ value: "default", coerced: false });
    expect(coerceFont("serif")).toEqual({ value: "serif", coerced: false });
    expect(coerceFont("comic")).toEqual({ value: null, coerced: true });
    expect(coerceColor("red.400")).toEqual({ value: "red.400", coerced: false });
    expect(coerceColor("blue.999")).toEqual({ value: null, coerced: true });
  });
});

describe("mapKyteContent", () => {
  it("preserves unknown link fields in a legacy bag and quarantines hard failures", () => {
    const result = mapKyteContent(
      kyte({
        userId: "u1",
        name: "Name",
        links: [
          { title: "", link: "javascript:alert(1)" },
          { title: "Keep", link: "https://example.com", emoji: "🔗", value: "dead-value" },
        ],
      }),
    );
    expect(result.content.links).toHaveLength(1);
    expect(result.quarantine).toHaveLength(1);
    expect(result.quarantine[0]?.field).toBe("links");
    const stored = result.storedLinks[0] as { legacy?: Record<string, unknown> };
    expect(stored.legacy).toEqual({ value: "dead-value" });
  });

  it("treats an empty emoji/color as absent instead of dropping the whole link", () => {
    const result = mapKyteContent(
      kyte({
        userId: "u-empty",
        links: [
          { title: "Kept", link: "https://example.com/a", color: "transparent", emoji: "" },
          { title: "Also kept", link: "https://example.com/b", emoji: "", color: "" },
          { title: "Whitespace", link: "https://example.com/c", emoji: "   " },
        ],
      }),
    );
    expect(result.quarantine).toHaveLength(0);
    expect(result.content.links).toHaveLength(3);
    expect(result.content.links.map((link) => link.title)).toEqual(["Kept", "Also kept", "Whitespace"]);
    for (const link of result.storedLinks as Record<string, unknown>[]) {
      expect("emoji" in link).toBe(false);
    }
    expect((result.storedLinks[0] as { color?: string }).color).toBe("transparent");
    expect("color" in (result.storedLinks[1] as Record<string, unknown>)).toBe(false);
  });

  it("maps a legacy Chakra link colour to the exact hex it rendered as", () => {
    const result = mapKyteContent(
      kyte({
        userId: "u-color",
        links: [
          { title: "Linkedin", link: "https://linkedin.com/in/x", color: "green.500" },
          { title: "Cases", link: "https://casesbydiya.com/", color: "purple.500" },
          { title: "Keeps token", link: "https://example.com", color: "red.400" },
          { title: "Keeps named", link: "https://example.org", color: "transparent" },
        ],
      }),
    );
    expect(result.quarantine).toHaveLength(0);
    const colors = (result.storedLinks as { color?: string }[]).map((link) => link.color);
    expect(colors).toEqual(["#38A169", "#805AD5", "red.400", "transparent"]);
    expect(result.coercions).toContain("link.color:green.500->#38A169(u-color)");
  });

  it("drops an unrenderable emoji but keeps the link", () => {
    const result = mapKyteContent(
      kyte({
        userId: "u-bad",
        links: [{ title: "Bad", link: "https://example.com", emoji: "javascript:alert(1)" }],
      }),
    );
    expect(result.quarantine).toHaveLength(0);
    expect(result.content.links).toHaveLength(1);
    expect("emoji" in (result.storedLinks[0] as Record<string, unknown>)).toBe(false);
    expect(result.coercions).toContain("link.emoji:invalid->dropped(u-bad)");
  });

  it("truncates an over-long link title and falls back to the host for an empty one", () => {
    const result = mapKyteContent(
      kyte({
        userId: "u-title",
        links: [
          { title: "x".repeat(140), link: "https://example.com/long" },
          { title: "   ", link: "https://shop.example.org/path" },
        ],
      }),
    );
    expect(result.quarantine).toHaveLength(0);
    expect(result.content.links[0]?.title).toHaveLength(100);
    expect(result.content.links[1]?.title).toBe("shop.example.org");
    expect(result.coercions).toContain("link.title:truncated(u-title)");
    expect(result.coercions).toContain("link.title:empty->host(u-title)");
  });

  it("still quarantines a link whose URL is unsafe", () => {
    const result = mapKyteContent(
      kyte({ userId: "u-xss", links: [{ title: "Bad", link: "javascript:alert(1)" }] }),
    );
    expect(result.quarantine).toHaveLength(1);
    expect(result.content.links).toHaveLength(0);
  });

  it("drops vcf (never present in ProfileContent) and records coercions", () => {
    const result = mapKyteContent(
      kyte({ userId: "u2", theme: "neon", customFont: "comic", vcf: { firstName: "x" } }),
    );
    expect(JSON.stringify(result.content)).not.toContain("firstName");
    expect(result.coercions).toContain("theme:neon->default");
    expect(result.coercions).toContain("customFont:comic->null");
  });

  it("truncates over-length display fields and records the coercion", () => {
    const result = mapKyteContent(
      kyte({ userId: "u3", name: "n".repeat(150), description: "d".repeat(543) }),
    );
    expect(result.content.displayName).toHaveLength(100);
    expect(result.content.description).toHaveLength(300);
    expect(result.coercions).toContain("displayName:truncated(150->100)");
    expect(result.coercions).toContain("description:truncated(543->300)");
  });

  it("does not split a surrogate pair at the truncation boundary", () => {
    const result = mapKyteContent(
      kyte({ userId: "u4", description: `${"d".repeat(299)}😀more` }),
    );
    expect(result.content.description).toBe("d".repeat(299));
  });

  it("nulls an unparseable redirect url and clears shouldRedirect", () => {
    const result = mapKyteContent(
      kyte({ userId: "u5", redirectLink: "javascript:alert(1)", shouldRedirect: true }),
    );
    expect(result.content.redirectUrl).toBeNull();
    expect(result.content.shouldRedirect).toBe(false);
    expect(result.coercions).toContain("redirectUrl:invalid->null");
  });

  it("caps links at MAX_PROFILE_LINKS and quarantines the overflow", () => {
    const links = Array.from({ length: 105 }, (_, i) => ({
      title: `Link ${i}`,
      link: `https://example.com/${i}`,
    }));
    const result = mapKyteContent(kyte({ userId: "u6", links }));
    expect(result.content.links).toHaveLength(100);
    expect(result.storedLinks).toHaveLength(100);
    expect(result.quarantine.filter((q) => q.reason === "over_link_cap")).toHaveLength(5);
  });
});

describe("planUsers", () => {
  it("quarantines null-email and lowercase-duplicate emails, flags admin role", () => {
    const plan = planUsers(
      [
        user({ id: "a", email: "Casey@Example.com" }),
        user({ id: "b", email: "casey@example.com" }),
        user({ id: "c", email: null }),
        user({ id: "d", email: "boss@kytelink.com" }),
      ],
      new Set(["boss@kytelink.com"]),
    );
    expect(plan.migrate.map((u) => u.id)).toEqual(["a", "d"]);
    expect(plan.quarantine.map((q) => q.reason)).toContain("null_email");
    expect(plan.quarantine.some((q) => q.reason.startsWith("duplicate_email"))).toBe(true);
    expect(plan.migrate.find((u) => u.id === "d")?.role).toBe("ADMIN");
    expect(plan.migrate.every((u) => u.emailVerified === true)).toBe(true);
  });
});

describe("mapAccount", () => {
  it("maps oauth providers and ignores non-oauth", () => {
    const base: LegacyAccountRow = {
      id: "acc",
      userId: "u",
      type: "oauth",
      provider: "google",
      providerAccountId: "gid",
      refresh_token: "r",
      access_token: "a",
      expires_at: 1_700_000_000,
      token_type: "bearer",
      scope: "email",
      id_token: "id",
      session_state: null,
    };
    const mapped = mapAccount(base);
    expect(mapped?.providerId).toBe("google");
    expect(mapped?.accountId).toBe("gid");
    expect(mapped?.accessTokenExpiresAt?.getTime()).toBe(1_700_000_000 * 1000);
    expect(mapAccount({ ...base, provider: "email" })).toBeNull();
  });
});

describe("planUsernames", () => {
  it("nulls case-collisions and reserved names, lowercases the rest", () => {
    const plan = planUsernames([
      { userId: "a", username: "CoolPerson" },
      { userId: "b", username: "coolperson" },
      { userId: "c", username: "admin" },
      { userId: "d", username: "Valid_Name" },
      { userId: "e", username: null },
    ]);
    expect(plan.assignments.get("a")).toBeNull();
    expect(plan.assignments.get("b")).toBeNull();
    expect(plan.assignments.get("c")).toBeNull();
    expect(plan.assignments.get("d")).toBe("valid_name");
    expect(plan.assignments.get("e")).toBeNull();
    expect(plan.collisions).toHaveLength(1);
    expect(plan.nulled.map((n) => n.reason)).toContain("case_collision");
    expect(plan.nulled.some((n) => n.reason.startsWith("invalid:"))).toBe(true);
  });
});

describe("personalOrgName", () => {
  it("follows the name -> username -> email-local -> default fallback chain", () => {
    expect(personalOrgName("Aleem", "aleem", "a@x.com")).toBe("Aleem");
    expect(personalOrgName(null, "aleem", "a@x.com")).toBe("aleem");
    expect(personalOrgName(null, null, "founder@x.com")).toBe("founder");
    expect(personalOrgName("  ", null, "@x.com")).toBe("My Kytelink");
  });
});

describe("isLegacyAssetUrl", () => {
  it("matches the four legacy hosts and rejects others", () => {
    expect(isLegacyAssetUrl(IMAGEDELIVERY_PFP)).toBe(true);
    expect(isLegacyAssetUrl(SUPABASE_PFP)).toBe(true);
    expect(isLegacyAssetUrl(CLOUDFRONT_PFP)).toBe(true);
    expect(isLegacyAssetUrl(DEAD_IBB_PFP)).toBe(true);
    expect(isLegacyAssetUrl("https://cdn.kytelink.com/u/x/avatar/y.webp")).toBe(false);
    expect(isLegacyAssetUrl(null)).toBe(false);
  });
});
