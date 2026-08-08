import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyProfileContent, THEME_KEYS, type ProfileContent } from "@kytelink/schemas";
import { ProfileView } from "./profile-view";

const richContent: ProfileContent = {
  ...emptyProfileContent(),
  displayName: "Agent Smith",
  description: "Testing the one true renderer across every theme.",
  customFont: "serif",
  customColor: "purple.400",
  avatar: {
    url: "u/k_1/avatar/01hq.webp",
    lqip: "data:image/webp;base64,UklGRhoAAABXRUJQ",
  },
  icons: [
    { name: "Twitter", url: "https://twitter.com/agent" },
    { name: "Github", url: "https://github.com/agent" },
    { name: "Contact", url: null },
  ],
  links: [
    { title: "Fa icon link", link: "https://example.com", emoji: "FaSpotify", color: "#1DB954" },
    { title: "Image link", link: "example.org", emoji: "https://cdn.example.com/a.png" },
    { title: "Emoji link", link: "https://kytelink.com", emoji: "🪁" },
    { title: "Bare link", link: "https://plain.com" },
  ],
};

describe("ProfileView across all 12 themes", () => {
  for (const theme of THEME_KEYS) {
    it(`renders the ${theme} theme without throwing and with key elements`, () => {
      const html = renderToStaticMarkup(
        <ProfileView content={{ ...richContent, theme }} onLinkClick={() => undefined} />,
      );
      expect(html).toContain(`data-theme="${theme}"`);
      expect(html).toContain("Agent Smith");
      expect(html).toContain("Fa icon link");
      expect(html).toContain("Emoji link");
      expect(html).toContain("🪁");
      expect(html).toContain("made with kytelink");
      expect(html).toContain("data-kytelink-watermark");
      expect(html).toContain('href="https://kytelink.com"');
      expect(html).toContain("data-kytelink-icons");
      expect(html.toLowerCase()).toContain('fetchpriority="high"');
      expect(html).toContain("kyte-avatar-lqip");
    });
  }

  it("renders socials above the links, matching v1's stack order", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={richContent} onLinkClick={() => undefined} />,
    );
    expect(html.indexOf("data-kytelink-icons")).toBeGreaterThan(-1);
    expect(html.indexOf("data-kytelink-links")).toBeGreaterThan(-1);
    expect(html.indexOf("data-kytelink-icons")).toBeLessThan(html.indexOf("data-kytelink-links"));
  });

  it("renders a fallback avatar with initials when no avatar url", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={{ ...richContent, avatar: null }} isPreview />,
    );
    expect(html).toContain('data-kytelink-avatar="fallback"');
    expect(html).toContain("AS");
  });

  it("honors themeOverride over content.theme", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={{ ...richContent, theme: "default" }} themeOverride="midnight" />,
    );
    expect(html).toContain('data-theme="midnight"');
  });

  it("normalizes protocol-less hrefs to https", () => {
    const html = renderToStaticMarkup(<ProfileView content={richContent} />);
    expect(html).toContain('href="https://example.org"');
  });

  it("suppresses focus outlines and collapses motion under reduced-motion", () => {
    const html = renderToStaticMarkup(<ProfileView content={richContent} />);
    expect(html).not.toContain("focus-visible");
    expect(html).toContain("outline:none");
    expect(html).toContain("prefers-reduced-motion");
  });

  it("renders empty content without throwing", () => {
    expect(() => renderToStaticMarkup(<ProfileView content={emptyProfileContent()} />)).not.toThrow();
  });

  it("points the watermark at kytelink.com/?ref={username} when username is passed", () => {
    const html = renderToStaticMarkup(<ProfileView content={richContent} username="agent" />);
    expect(html).toContain('data-kytelink-watermark=""');
    expect(html).toContain('href="https://kytelink.com/?ref=agent"');
  });

  it("encodes the ref username", () => {
    const html = renderToStaticMarkup(<ProfileView content={richContent} username="a b&c" />);
    expect(html).toContain("href=\"https://kytelink.com/?ref=a%20b%26c\"");
  });

  it("falls back to the bare watermark without a username", () => {
    const html = renderToStaticMarkup(<ProfileView content={richContent} />);
    expect(html).toContain('href="https://kytelink.com"');
    expect(html).not.toContain("?ref=");
  });

  it("falls back to the bare watermark in preview even with a username", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={richContent} username="agent" isPreview />,
    );
    expect(html).not.toContain("?ref=");
  });

  it("drops the watermark entirely when hideWatermark is set", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={{ ...richContent, hideWatermark: true }} username="agent" />,
    );
    expect(html).not.toContain("data-kytelink-watermark");
    expect(html).not.toContain("made with kytelink");
    expect(html).not.toContain("kytelink.com/?ref=agent");
  });

  it("accepts an onIconClick handler and still renders the icon row", () => {
    const html = renderToStaticMarkup(
      <ProfileView content={richContent} onIconClick={() => undefined} />,
    );
    expect(html).toContain('data-kytelink-icon=""');
    expect(html).toContain('data-icon-name="Twitter"');
  });
});
