import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { emptyProfileContent, type ProfileContent } from "@kytelink/schemas";
import {
  buildProfileSeo,
  CountrySplit,
  defaultSeoConfig,
  DeviceSplit,
  getCdnUrl,
  getLqipUrl,
  listItemMotion,
  ProfileView,
  ReferrersList,
  StatTile,
  TimeSeriesChart,
  TopLinksBarList,
} from "./index";

const seedContent: ProfileContent = {
  ...emptyProfileContent(),
  displayName: "Agent Smith",
  description: "Testing the one true renderer.",
  theme: "midnight",
  links: [
    { title: "My site", link: "https://example.com" },
    { title: "Repo", link: "https://github.com/kytelink" },
  ],
  icons: [{ name: "Twitter", url: "https://twitter.com/kytelink" }],
};

describe("packages/ui surface", () => {
  it("renders ProfileView from a seed-like ProfileContent", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileView, { content: seedContent, isPreview: true }),
    );
    expect(html).toContain("Agent Smith");
    expect(html).toContain("My site");
    expect(html).toContain('data-theme="midnight"');
  });

  it("respects themeOverride and calls onLinkClick prop shape", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileView, {
        content: seedContent,
        themeOverride: "paper",
        onLinkClick: () => undefined,
      }),
    );
    expect(html).toContain('data-theme="paper"');
  });

  it("renders every chart skeleton with mock data without throwing", () => {
    const charts = [
      createElement(StatTile, { label: "Views", value: 1234, delta: 12 }),
      createElement(TimeSeriesChart, {
        data: [
          { date: "2026-07-01", views: 3 },
          { date: "2026-07-02", views: 9 },
        ],
      }),
      createElement(TopLinksBarList, {
        data: [{ linkUrl: "https://a.com", linkTitle: "A", clicks: 5 }],
      }),
      createElement(ReferrersList, { data: [{ refDomain: "t.co", views: 8 }] }),
      createElement(DeviceSplit, {
        data: [
          { device: "MOBILE" as const, views: 7 },
          { device: "DESKTOP" as const, views: 3 },
        ],
      }),
      createElement(CountrySplit, { data: [{ country: "US", views: 10 }] }),
    ];
    for (const chart of charts) {
      expect(() => renderToStaticMarkup(chart)).not.toThrow();
    }
  });

  it("builds profile SEO with parity strings and apex canonical", () => {
    const seo = buildProfileSeo({
      username: "agent",
      displayName: null,
      seoTitle: null,
      seoDescription: null,
      ogImageUrl: null,
    });
    expect(seo.title).toBe("agent | Kytelink");
    expect(seo.canonical).toBe("https://kytelink.com/agent");
    expect(defaultSeoConfig.titleTemplate).toBe("%s | Kytelink");
  });

  it("exposes motion presets and cdn helpers", () => {
    expect(listItemMotion.visible).toBeDefined();
    expect(typeof getCdnUrl).toBe("function");
    expect(typeof getLqipUrl).toBe("function");
  });
});
