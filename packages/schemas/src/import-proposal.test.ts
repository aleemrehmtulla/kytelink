import { describe, expect, it } from "vitest";
import { IMPORT_MAX_LINKS, importProposalSchema } from "./import-proposal";

describe("importProposalSchema", () => {
  it("parses a proposal and applies the URL policy (prefixing https)", () => {
    const parsed = importProposalSchema.parse({
      displayName: "Imported",
      avatarUrl: "cdn.example.com/a.png",
      links: [{ title: "Site", link: "example.com" }],
      icons: [{ name: "Twitter", url: "https://twitter.com/x" }],
    });
    expect(parsed.avatarUrl).toBe("https://cdn.example.com/a.png");
    expect(parsed.links[0]?.link).toBe("https://example.com");
  });

  it("rejects more than the max links", () => {
    const links = Array.from({ length: IMPORT_MAX_LINKS + 1 }, (_, i) => ({
      title: `L${i}`,
      link: "https://example.com",
    }));
    expect(importProposalSchema.safeParse({ links, icons: [] }).success).toBe(false);
  });

  it("rejects a javascript: link", () => {
    expect(
      importProposalSchema.safeParse({
        links: [{ title: "x", link: "javascript:alert(1)" }],
        icons: [],
      }).success,
    ).toBe(false);
  });
});
