import { afterEach, describe, expect, it } from "vitest";
import { getCdnUrl, getLqipUrl } from "./index";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CDN_URL;
});

describe("packages/cdn smoke", () => {
  it("resolves owned keys to the local server in dev", () => {
    expect(getCdnUrl("logos/icon.svg")).toBe("http://localhost:5002/logos/icon.svg");
  });

  it("passes through absolute urls", () => {
    expect(getCdnUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });

  it("always resolves u/ keys to the remote host", () => {
    expect(getCdnUrl("u/abc/avatar.png")).toContain("cdn.kytelink.com/u/abc/avatar.png");
  });

  it("appends a version cache-buster", () => {
    expect(getCdnUrl("logos/icon.svg", { version: "1" })).toBe(
      "http://localhost:5002/logos/icon.svg?v=1",
    );
  });

  it("maps a key to its lqip sibling", () => {
    expect(getLqipUrl("u/abc/avatar.png")).toContain("cdn.kytelink.com/u/abc/avatar.lqip.png");
  });

  it("reads NEXT_PUBLIC_CDN_URL live, not just at import time", () => {
    process.env.NEXT_PUBLIC_CDN_URL = "https://cdn.example.test";
    expect(getCdnUrl("u/abc/avatar.png")).toBe("https://cdn.example.test/u/abc/avatar.png");
  });
});
