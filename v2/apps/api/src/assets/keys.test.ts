import { describe, expect, it } from "vitest";
import {
  buildAssetKey,
  buildLqipKey,
  buildOgKey,
  buildRawUploadKey,
  isOwnedByKyte,
  liveKeyFor,
  liveKyteObjectPrefix,
  quarantineKeyFor,
  quarantineKyteObjectPrefix,
} from "./keys";

describe("key layout (08-media.md strict)", () => {
  it("builds avatar keys under u/{kyteId}/avatar/", () => {
    expect(buildAssetKey("k1", "AVATAR", "01ULID", "webp")).toBe("u/k1/avatar/01ULID.webp");
  });

  it("builds link image keys under u/{kyteId}/links/", () => {
    expect(buildAssetKey("k1", "LINK_IMAGE", "01ULID", "webp")).toBe("u/k1/links/01ULID.webp");
  });

  it("builds OG keys under u/{kyteId}/og/{contentHash}.png", () => {
    expect(buildOgKey("k1", "abc123")).toBe("u/k1/og/abc123.png");
  });

  it("builds the .lqip sibling before the extension", () => {
    expect(buildLqipKey("u/k1/avatar/01ULID.webp")).toBe("u/k1/avatar/01ULID.lqip.webp");
  });

  it("raw uploads live outside u/ and q/", () => {
    const raw = buildRawUploadKey("k1", "asset1");
    expect(raw.startsWith("u/")).toBe(false);
    expect(raw.startsWith("q/")).toBe(false);
  });
});

describe("quarantine key mapping", () => {
  it("maps u/ <-> q/ losslessly", () => {
    const live = "u/k1/avatar/01ULID.webp";
    const quarantined = quarantineKeyFor(live);
    expect(quarantined).toBe("q/k1/avatar/01ULID.webp");
    expect(liveKeyFor(quarantined)).toBe(live);
  });

  it("rejects mapping a key that isn't in the expected prefix", () => {
    expect(() => quarantineKeyFor("q/k1/avatar/x.webp")).toThrow();
    expect(() => liveKeyFor("u/k1/avatar/x.webp")).toThrow();
  });

  it("computes per-kyte object prefixes", () => {
    expect(liveKyteObjectPrefix("k1")).toBe("u/k1/");
    expect(quarantineKyteObjectPrefix("k1")).toBe("q/k1/");
  });
});

describe("isOwnedByKyte", () => {
  it("recognizes live, quarantined, and raw keys for the given kyte", () => {
    expect(isOwnedByKyte("u/k1/avatar/x.webp", "k1")).toBe(true);
    expect(isOwnedByKyte("q/k1/avatar/x.webp", "k1")).toBe(true);
    expect(isOwnedByKyte("raw/k1/asset1", "k1")).toBe(true);
    expect(isOwnedByKyte("u/k2/avatar/x.webp", "k1")).toBe(false);
  });
});
