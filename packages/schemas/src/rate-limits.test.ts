import { describe, expect, it } from "vitest";
import { RATE_LIMIT_CLASSES, RATE_LIMIT_SUBJECTS } from "./rate-limits";

describe("rate-limit classes", () => {
  it("beacon is ip-scoped at 3750/min", () => {
    expect(RATE_LIMIT_CLASSES.beacon).toEqual([{ limit: 3750, windowSec: 60, subject: "ip" }]);
  });

  it("beacon-per-kyte is per-visitor-per-kyte (ip+kyte), not a global kyte cap", () => {
    expect(RATE_LIMIT_CLASSES["beacon-per-kyte"]).toEqual([
      { limit: 750, windowSec: 60, subject: "ip+kyte" },
    ]);
    expect(RATE_LIMIT_SUBJECTS).toContain("ip+kyte");
  });

  it("username-check is user-scoped (authed), not ip", () => {
    expect(RATE_LIMIT_CLASSES["username-check"]).toEqual([
      { limit: 450, windowSec: 60, subject: "user" },
    ]);
  });

  it("otp-send keeps its dual email + ip windows", () => {
    expect(RATE_LIMIT_CLASSES["otp-send"]).toEqual([
      { limit: 15, windowSec: 900, subject: "email" },
      { limit: 150, windowSec: 3600, subject: "ip" },
    ]);
  });

  it("trpc-write clears sustained editor autosave (short-debounce saves)", () => {
    const [rule] = RATE_LIMIT_CLASSES["trpc-write"];
    expect(rule).toBeDefined();
    expect(rule!.subject).toBe("user");
    expect(rule!.limit / (rule!.windowSec / 60)).toBeGreaterThanOrEqual(300);
  });
});
