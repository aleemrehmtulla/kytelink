import { describe, expect, it } from "vitest";
import { resolveBotFlag } from "./bot-flag";

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const REAL_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

describe("resolveBotFlag", () => {
  it("flags a known crawler user agent", () => {
    expect(resolveBotFlag(GOOGLEBOT)).toBe(1);
  });

  it("does not flag a real browser user agent", () => {
    expect(resolveBotFlag(REAL_BROWSER)).toBe(0);
  });

  it("flags a missing user agent as a bot", () => {
    expect(resolveBotFlag(undefined)).toBe(1);
  });
});
