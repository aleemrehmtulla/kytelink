import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { SharpImageNormalizer, sharpNormalizeModule } from "./sharp-normalize";

async function makeTestJpeg(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("sharpNormalizeModule.normalizeImage", () => {
  it("produces a 512x512 webp avatar + a small lqip from a single decode", async () => {
    const input = await makeTestJpeg(1200, 900);
    const result = await sharpNormalizeModule.normalizeImage(input, "avatar");

    expect(result.main.width).toBe(512);
    expect(result.main.height).toBe(512);
    expect(result.main.contentType).toBe("image/webp");
    expect(result.main.ext).toBe("webp");
    expect(result.main.sizeBytes).toBe(result.main.buffer.byteLength);
    expect(result.main.sizeBytes).toBeGreaterThan(0);

    expect(result.lqip.width).toBeLessThanOrEqual(24);
    expect(result.lqip.height).toBeLessThanOrEqual(24);
    expect(result.lqip.sizeBytes).toBeLessThan(result.main.sizeBytes);

    const mainMeta = await sharp(Buffer.from(result.main.buffer)).metadata();
    expect(mainMeta.format).toBe("webp");
    const lqipMeta = await sharp(Buffer.from(result.lqip.buffer)).metadata();
    expect(lqipMeta.format).toBe("webp");
  });

  it("caps link images at 256px on the long edge without upscaling small ones", async () => {
    const wide = await makeTestJpeg(1000, 300);
    const result = await sharpNormalizeModule.normalizeImage(wide, "link_image");
    expect(Math.max(result.main.width, result.main.height)).toBeLessThanOrEqual(256);
    expect(result.main.width / result.main.height).toBeCloseTo(1000 / 300, 1);

    const small = await makeTestJpeg(50, 50);
    const smallResult = await sharpNormalizeModule.normalizeImage(small, "link_image");
    expect(smallResult.main.width).toBe(50);
    expect(smallResult.main.height).toBe(50);
  });

  it("throws on a non-image buffer instead of returning garbage", async () => {
    await expect(
      sharpNormalizeModule.normalizeImage(new TextEncoder().encode("definitely not an image"), "avatar"),
    ).rejects.toThrow();
  });

  it("throws on empty input", async () => {
    await expect(sharpNormalizeModule.normalizeImage(new Uint8Array(0), "avatar")).rejects.toThrow();
  });

  it("is exported as a class implementing the exact W8 seam interface", async () => {
    const normalizer = new SharpImageNormalizer();
    const input = await makeTestJpeg(600, 600);
    const result = await normalizer.normalizeImage(input, "avatar");
    expect(result.main).toBeDefined();
    expect(result.lqip).toBeDefined();
  });
});
