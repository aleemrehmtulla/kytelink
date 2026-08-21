import { describe, expect, it } from "vitest";
import { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import {
  MARKDOWN_PAGE_PATHS,
  buildNotFoundMarkdown,
  buildPageMarkdown,
  normalizeMarkdownPath,
} from "./build-page-markdown";

describe("buildPageMarkdown", () => {
  it("covers every static sitemap path", () => {
    for (const path of STATIC_SITEMAP_PATHS) {
      expect(buildPageMarkdown(path), path).toBeTruthy();
    }
  });

  it("renders a markdown document for every registered path", () => {
    for (const path of MARKDOWN_PAGE_PATHS) {
      const markdown = buildPageMarkdown(path);
      expect(markdown, path).toMatch(/^# /);
      expect(markdown, path).toContain("](");
    }
  });

  it("returns null for unknown paths", () => {
    expect(buildPageMarkdown("/nope")).toBeNull();
    expect(buildPageMarkdown("/features/nope")).toBeNull();
  });

  it("normalizes trailing slashes and query strings", () => {
    expect(normalizeMarkdownPath("/pricing/")).toBe("/pricing");
    expect(normalizeMarkdownPath("/pricing?ref=x")).toBe("/pricing");
    expect(normalizeMarkdownPath("")).toBe("/");
    expect(buildPageMarkdown("/pricing/")).toEqual(buildPageMarkdown("/pricing"));
  });

  it("renders compare tables with yes/no cells", () => {
    const markdown = buildPageMarkdown("/compare/linktree");
    expect(markdown).toContain("| Open source | Yes | No |");
    expect(markdown).toContain("| --- | --- | --- |");
  });

  it("renders full legal documents", () => {
    const markdown = buildPageMarkdown("/privacy-policy");
    expect(markdown).toContain("# Privacy policy");
    expect(markdown).toContain("## What we collect");
    expect(markdown).toMatch(/\*Last updated \d{4}-\d{2}-\d{2}\*/);
  });

  it("includes the support email on the contact page", () => {
    expect(buildPageMarkdown("/contact")).toContain("support@kytelink.com");
  });

  it("covers the report and appeal pages", () => {
    expect(buildPageMarkdown("/report")).toContain("/report");
    expect(buildPageMarkdown("/appeal")).toContain("/appeal");
  });
});

describe("buildNotFoundMarkdown", () => {
  it("points agents at recovery links", () => {
    const markdown = buildNotFoundMarkdown("/some-path-that-does-not-exist");
    expect(markdown).toMatch(/^# 404/);
    expect(markdown).toContain("/llms.txt");
    expect(markdown).toContain("/sitemap.xml");
    expect(markdown).toContain("`/some-path-that-does-not-exist`");
  });
});
