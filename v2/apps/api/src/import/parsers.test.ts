import { describe, expect, it } from "vitest";
import { detectPlatform, parseHtmlToProposal, parseLinktreeToProposal } from "./parsers";

function linktreeHtml(pageProps: unknown): string {
  const json = JSON.stringify({ props: { pageProps } });
  return `<!doctype html><html><head></head><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json" crossorigin="anonymous">${json}</script></body></html>`;
}

describe("detectPlatform", () => {
  it("classifies known link-in-bio hosts", () => {
    expect(detectPlatform("https://linktr.ee/someone")).toBe("linktree");
    expect(detectPlatform("https://beacons.ai/someone")).toBe("beacons");
    expect(detectPlatform("https://bio.link/someone")).toBe("biolink");
    expect(detectPlatform("https://example.com/x")).toBe("generic");
  });
});

describe("parseLinktreeToProposal", () => {
  it("reads the creator's links from __NEXT_DATA__, not page chrome", () => {
    const html = linktreeHtml({
      pageTitle: "Chelsea Handler",
      description: "The high and mighty tour",
      account: { profilePictureUrl: "https://ugc.example.com/avatar.jpeg" },
      links: [
        { title: "The High and Mighty Tour", url: "", type: "GROUP" },
        { title: "Visit my website", url: "https://chelseahandler.com", type: "CLASSIC" },
        { title: "Merch", url: "https://chelseahandler.com/store", type: "PRODUCT" },
      ],
    });
    const proposal = parseLinktreeToProposal(html);
    expect(proposal).not.toBeNull();
    expect(proposal?.displayName).toBe("Chelsea Handler");
    expect(proposal?.description).toBe("The high and mighty tour");
    expect(proposal?.avatarUrl).toBe("https://ugc.example.com/avatar.jpeg");
    expect(proposal?.links.map((l) => l.link)).toEqual([
      "https://chelseahandler.com",
      "https://chelseahandler.com/store",
    ]);
  });

  it("dedupes links and falls back to the url when a title is missing", () => {
    const html = linktreeHtml({
      pageTitle: "Someone",
      links: [
        { title: "Site", url: "https://example.com" },
        { title: "", url: "https://example.com" },
        { title: "  ", url: "https://other.com" },
      ],
    });
    const proposal = parseLinktreeToProposal(html);
    expect(proposal?.links).toEqual([
      { title: "Site", link: "https://example.com" },
      { title: "https://other.com", link: "https://other.com" },
    ]);
  });

  it("returns null when there is no __NEXT_DATA__ or no usable links", () => {
    expect(parseLinktreeToProposal("<html><body>nope</body></html>")).toBeNull();
    expect(parseLinktreeToProposal(linktreeHtml({ pageTitle: "x", links: [] }))).toBeNull();
    expect(
      parseLinktreeToProposal(linktreeHtml({ links: [{ title: "Header", url: "" }] })),
    ).toBeNull();
  });
});

describe("parseHtmlToProposal (generic anchor fallback)", () => {
  it("decodes HTML entities in hrefs so query strings survive", () => {
    const html = `<a href="https://example.com/?a=1&amp;b=2">Link</a>`;
    const proposal = parseHtmlToProposal(html);
    expect(proposal.links[0]?.link).toBe("https://example.com/?a=1&b=2");
  });
});
