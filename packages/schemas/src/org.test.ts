import { describe, expect, it } from "vitest";
import { defaultOrgName } from "./org";

describe("defaultOrgName", () => {
  it("uses the full name when a name is present", () => {
    expect(defaultOrgName("Aleem Rehmtulla", "a@x.com")).toBe("Aleem Rehmtulla's Organization");
    expect(defaultOrgName("Aleem", "a@x.com")).toBe("Aleem's Organization");
    expect(defaultOrgName("  Aleem   Rehmtulla ", null)).toBe("Aleem Rehmtulla's Organization");
  });

  it("falls back to a capitalized email local-part", () => {
    expect(defaultOrgName(null, "founder@x.com")).toBe("Founder's Organization");
    expect(defaultOrgName("   ", "agent@kytelink.dev")).toBe("Agent's Organization");
  });

  it("falls back to a generic name when nothing is usable", () => {
    expect(defaultOrgName(null, null)).toBe("My Organization");
    expect(defaultOrgName("  ", "@x.com")).toBe("My Organization");
  });
});
