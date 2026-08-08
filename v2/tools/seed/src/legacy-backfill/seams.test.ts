import { describe, expect, it } from "vitest";
import {
  ImageFetchError,
  InMemoryAssetStore,
  StubImageFetcher,
  StubNormalizeModule,
} from "./seams";

describe("StubImageFetcher", () => {
  it("returns bytes for live hosts and throws for dead i.ibb.co", async () => {
    const fetcher = new StubImageFetcher();
    const bytes = await fetcher.fetch("https://imagedelivery.net/x/y/public");
    expect(bytes.length).toBeGreaterThan(0);
    await expect(fetcher.fetch("https://i.ibb.co/dead/x.png")).rejects.toBeInstanceOf(ImageFetchError);
  });
});

describe("StubNormalizeModule", () => {
  it("is deterministic for identical input and throws on empty buffer", async () => {
    const normalize = new StubNormalizeModule();
    const input = new Uint8Array([1, 2, 3, 4]);
    const a = await normalize.normalizeImage(input, "avatar");
    const b = await normalize.normalizeImage(input, "avatar");
    expect(a.main.sizeBytes).toBe(b.main.sizeBytes);
    expect(a.main.width).toBe(512);
    expect(a.lqip.width).toBe(24);
    await expect(normalize.normalizeImage(new Uint8Array(0), "avatar")).rejects.toThrow();
  });
});

describe("InMemoryAssetStore", () => {
  it("records objects and reports size via head", async () => {
    const store = new InMemoryAssetStore();
    await store.put("u/k/avatar/x.webp", new Uint8Array(100), "image/webp");
    expect(await store.has("u/k/avatar/x.webp")).toBe(true);
    expect(store.head("u/k/avatar/x.webp")?.size).toBe(100);
  });
});
