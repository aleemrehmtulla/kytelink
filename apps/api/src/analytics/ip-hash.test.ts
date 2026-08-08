import { describe, expect, it } from "vitest";
import { hashIp } from "./ip-hash";

describe("hashIp", () => {
  it("never stores the raw ip in the output", () => {
    expect(hashIp("203.0.113.7")).not.toContain("203.0.113.7");
  });

  it("is deterministic for the same ip and day", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    expect(hashIp("203.0.113.7", now)).toBe(hashIp("203.0.113.7", now));
  });

  it("rotates across calendar days", () => {
    const day1 = new Date("2026-07-18T23:59:00.000Z");
    const day2 = new Date("2026-07-19T00:01:00.000Z");
    expect(hashIp("203.0.113.7", day1)).not.toBe(hashIp("203.0.113.7", day2));
  });

  it("produces a 64-char hex sha256 digest", () => {
    expect(hashIp("203.0.113.7")).toMatch(/^[0-9a-f]{64}$/);
  });
});
