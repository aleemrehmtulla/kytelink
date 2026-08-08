import { describe, expect, it } from "vitest";
import { resolveRefDomain } from "./ref-domain";

describe("resolveRefDomain", () => {
  it("returns direct when there is no referrer", () => {
    expect(resolveRefDomain(undefined)).toBe("direct");
    expect(resolveRefDomain("")).toBe("direct");
  });

  it("extracts and lowercases the hostname", () => {
    expect(resolveRefDomain("https://Instagram.com/some/path?x=1")).toBe("instagram.com");
  });

  it("strips a leading www.", () => {
    expect(resolveRefDomain("https://www.google.com/search")).toBe("google.com");
  });

  it("falls back to direct for an unparseable referrer", () => {
    expect(resolveRefDomain("not-a-url")).toBe("direct");
  });
});
