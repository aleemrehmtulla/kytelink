import { describe, expect, it } from "vitest";
import { computeContentHash } from "./content-hash";
import { buildSnapshot } from "./fixtures";

describe("computeContentHash", () => {
  it("is stable for identical content", () => {
    const snapshot = buildSnapshot();
    expect(computeContentHash(snapshot)).toBe(computeContentHash(snapshot));
  });

  it("changes when a link url changes", () => {
    const a = buildSnapshot({ links: [{ title: "Site", url: "https://a.com" }] });
    const b = buildSnapshot({ links: [{ title: "Site", url: "https://b.com" }] });
    expect(computeContentHash(a)).not.toBe(computeContentHash(b));
  });

  it("does not collide across a field boundary shift", () => {
    const a = buildSnapshot({ displayName: "ab", description: "" });
    const b = buildSnapshot({ displayName: "a", description: "b" });
    expect(computeContentHash(a)).not.toBe(computeContentHash(b));
  });

  it("is independent of fields outside the documented hash inputs", () => {
    const a = buildSnapshot({ publishSeq: 1, moderationStatus: "APPROVED" });
    const b = buildSnapshot({ publishSeq: 99, moderationStatus: "SUSPENDED" });
    expect(computeContentHash(a)).toBe(computeContentHash(b));
  });
});
