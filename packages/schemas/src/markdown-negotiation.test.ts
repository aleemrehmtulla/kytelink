import { describe, expect, it } from "vitest";
import { prefersMarkdown } from "./markdown-negotiation";

describe("prefersMarkdown", () => {
  it("accepts a bare text/markdown header", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
  });

  it("accepts markdown alongside a wildcard", () => {
    expect(prefersMarkdown("text/markdown, */*;q=0.8")).toBe(true);
  });

  it("accepts markdown when it outranks html", () => {
    expect(prefersMarkdown("text/html;q=0.5, text/markdown")).toBe(true);
  });

  it("accepts markdown tied with html", () => {
    expect(prefersMarkdown("text/markdown, text/html")).toBe(true);
  });

  it("rejects markdown ranked below html", () => {
    expect(prefersMarkdown("text/markdown;q=0.4, text/html")).toBe(false);
  });

  it("rejects a browser accept header", () => {
    expect(
      prefersMarkdown(
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      ),
    ).toBe(false);
  });

  it("rejects a lone wildcard", () => {
    expect(prefersMarkdown("*/*")).toBe(false);
  });

  it("rejects markdown with q=0", () => {
    expect(prefersMarkdown("text/markdown;q=0")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown(undefined)).toBe(false);
    expect(prefersMarkdown("")).toBe(false);
  });

  it("handles casing and whitespace", () => {
    expect(prefersMarkdown(" Text/Markdown ; q=1.0 ")).toBe(true);
  });

  it("treats a malformed q as full quality", () => {
    expect(prefersMarkdown("text/markdown;q=banana")).toBe(true);
  });
});
