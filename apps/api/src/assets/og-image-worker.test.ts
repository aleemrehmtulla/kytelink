import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { processOgImageJob } from "./og-image-worker";
import { getObjectBuffer, headObject, putObject } from "./s3-client";
import { repositoryFor } from "./repository";

let store: MemoryStore;

beforeEach(() => {
  store = createSeededStore();
});

describe("processOgImageJob (satori -> resvg PNG, real MinIO)", () => {
  it("renders a 1200x630 PNG card keyed by contentHash and writes one Asset row", async () => {
    const result = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte",
      username: "agent",
      theme: "default",
    });

    expect(result.skipped).toBe(false);
    expect(result.key).toMatch(/^u\/usr_agent\/og\/[0-9a-f]{16}\.png$/);

    const head = await headObject(result.key);
    expect(head.contentType).toBe("image/png");

    const buffer = Buffer.from(await getObjectBuffer(result.key));
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe("png");

    const row = await repositoryFor(store).findOgAssetForKyte("usr_agent");
    expect(row?.id).toBe(result.assetId);
    expect(row?.kind).toBe("OG_IMAGE");
  }, 30000);

  it("is idempotent: identical content re-renders nothing and returns skipped:true", async () => {
    const first = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte",
      username: "agent",
      theme: "default",
    });
    const second = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte",
      username: "agent",
      theme: "default",
    });

    expect(second.skipped).toBe(true);
    expect(second.key).toBe(first.key);
    expect(second.assetId).toBe(first.assetId);
  }, 30000);

  it("deletes the previous OG object + Asset row in the same job — exactly one OG asset per kyte", async () => {
    const first = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte",
      username: "agent",
      theme: "default",
    });

    const second = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte, Renamed",
      username: "agent",
      theme: "dark",
    });

    expect(second.key).not.toBe(first.key);
    await expect(headObject(first.key)).rejects.toThrow();

    const repo = repositoryFor(store);
    expect(await repo.getAsset(first.assetId)).toBeUndefined();
    const ogAssets = (await repo.listForKyte("usr_agent")).filter((a) => a.kind === "OG_IMAGE");
    expect(ogAssets).toHaveLength(1);
    expect(ogAssets[0]?.id).toBe(second.assetId);
  }, 30000);

  it("embeds a provided avatar without erroring", async () => {
    const avatarWebp = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 10, g: 200, b: 90 } },
    })
      .webp()
      .toBuffer();
    const avatarKey = "u/usr_agent/avatar/test-fixture.webp";
    await putObject(avatarKey, new Uint8Array(avatarWebp), "image/webp");

    const result = await processOgImageJob(store, {
      kyteId: "usr_agent",
      displayName: "Agent Kyte",
      username: "agent",
      theme: "popsicle",
      avatarKey,
    });

    expect(result.skipped).toBe(false);
    const buffer = Buffer.from(await getObjectBuffer(result.key));
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(1200);
  }, 30000);
});
