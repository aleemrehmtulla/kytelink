import { describe, expect, it } from "vitest";
import { generateInitialsAvatarSvg, initialsFor } from "./initials-avatar";

describe("initialsFor", () => {
  it("takes first+last initial for multi-word names", () => {
    expect(initialsFor("Aleem Rehmtulla")).toBe("AR");
  });

  it("takes first two letters for a single word", () => {
    expect(initialsFor("Agent")).toBe("AG");
  });

  it("falls back to ? for empty input", () => {
    expect(initialsFor("")).toBe("?");
  });
});

describe("generateInitialsAvatarSvg", () => {
  it("produces deterministic, valid, dependency-free SVG markup", () => {
    const first = generateInitialsAvatarSvg("Agent Kyte");
    const second = generateInitialsAvatarSvg("Agent Kyte");
    expect(first).toBe(second);
    expect(first).toContain("<svg");
    expect(first).toContain("AK");
    expect(first).not.toContain("<image");
    expect(first).not.toMatch(/cdn\.|amazonaws|cloudflare/i);
  });

  it("varies background color deterministically by name", () => {
    const a = generateInitialsAvatarSvg("Alice");
    const b = generateInitialsAvatarSvg("Zeus");
    expect(a).not.toBe(b);
  });
});
