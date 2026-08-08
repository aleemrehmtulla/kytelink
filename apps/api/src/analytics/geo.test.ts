import { describe, expect, it } from "vitest";
import { resolveCountry } from "./geo";

describe("resolveCountry", () => {
  it("prefers cf-ipcountry", () => {
    expect(resolveCountry({ "cf-ipcountry": "us", "x-vercel-ip-country": "CA" })).toBe("US");
  });

  it("falls back to x-vercel-ip-country", () => {
    expect(resolveCountry({ "x-vercel-ip-country": "gb" })).toBe("GB");
  });

  it("takes the first value when a header is an array", () => {
    expect(resolveCountry({ "cf-ipcountry": ["fr", "de"] })).toBe("FR");
  });

  it("falls back to XX when no geo header is present", () => {
    expect(resolveCountry({})).toBe("XX");
  });

  it("falls back to XX for a malformed country code", () => {
    expect(resolveCountry({ "cf-ipcountry": "T1" })).toBe("XX");
  });
});
