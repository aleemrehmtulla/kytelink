import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { assertIsImage, detectImageType } from "./magic-bytes";

describe("detectImageType", () => {
  it("detects a real png", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    expect(detectImageType(new Uint8Array(png))).toBe("png");
  });

  it("detects a real webp", async () => {
    const webp = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .webp()
      .toBuffer();
    expect(detectImageType(new Uint8Array(webp))).toBe("webp");
  });

  it("returns null for non-image bytes", () => {
    expect(detectImageType(new TextEncoder().encode("not an image at all"))).toBeNull();
  });

  it("returns null for a PNG extension with a text payload (extension spoof)", () => {
    const spoofed = new TextEncoder().encode("<html>not really a png</html>");
    expect(detectImageType(spoofed)).toBeNull();
  });
});

describe("assertIsImage", () => {
  it("throws on corrupt input", () => {
    expect(() => assertIsImage(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
