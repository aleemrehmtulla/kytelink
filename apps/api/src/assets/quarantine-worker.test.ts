import { describe, expect, it } from "vitest";
import { ulid } from "ulid";
import { processQuarantineJob } from "./quarantine-worker";
import { headObject, putObject } from "./s3-client";

async function seedLiveObjects(kyteId: string): Promise<string[]> {
  const keys = [`u/${kyteId}/avatar/${ulid()}.webp`, `u/${kyteId}/links/${ulid()}.webp`];
  for (const key of keys) {
    await putObject(key, new TextEncoder().encode("fixture-bytes"), "image/webp");
  }
  return keys;
}

describe("processQuarantineJob (server-side copy+delete, real MinIO)", () => {
  it("moves every object under u/{kyteId}/ to q/{kyteId}/ on quarantine", async () => {
    const kyteId = `kyte_${ulid()}`;
    const liveKeys = await seedLiveObjects(kyteId);

    const result = await processQuarantineJob({ kyteId, direction: "quarantine" });
    expect(result.total).toBe(2);
    expect(result.moved).toBe(2);

    for (const liveKey of liveKeys) {
      await expect(headObject(liveKey)).rejects.toThrow();
      const quarantineKey = liveKey.replace(/^u\//, "q/");
      await expect(headObject(quarantineKey)).resolves.toBeDefined();
    }
  }, 30000);

  it("moves everything back to u/{kyteId}/ on restore", async () => {
    const kyteId = `kyte_${ulid()}`;
    const liveKeys = await seedLiveObjects(kyteId);
    await processQuarantineJob({ kyteId, direction: "quarantine" });

    const result = await processQuarantineJob({ kyteId, direction: "restore" });
    expect(result.moved).toBe(2);

    for (const liveKey of liveKeys) {
      await expect(headObject(liveKey)).resolves.toBeDefined();
      const quarantineKey = liveKey.replace(/^u\//, "q/");
      await expect(headObject(quarantineKey)).rejects.toThrow();
    }
  }, 30000);

  it("is idempotent: re-running a completed quarantine moves nothing", async () => {
    const kyteId = `kyte_${ulid()}`;
    await seedLiveObjects(kyteId);
    await processQuarantineJob({ kyteId, direction: "quarantine" });

    const rerun = await processQuarantineJob({ kyteId, direction: "quarantine" });
    expect(rerun.total).toBe(0);
    expect(rerun.moved).toBe(0);
  }, 30000);

  it("is resumable: an object already copied to the destination is not re-copied, just cleaned up", async () => {
    const kyteId = `kyte_${ulid()}`;
    const [key] = await seedLiveObjects(kyteId);
    const quarantineKey = key!.replace(/^u\//, "q/");

    await putObject(quarantineKey, new TextEncoder().encode("already-moved"), "image/webp");

    const result = await processQuarantineJob({ kyteId, direction: "quarantine" });
    expect(result.moved).toBe(2);
    await expect(headObject(key!)).rejects.toThrow();
    await expect(headObject(quarantineKey)).resolves.toBeDefined();
  }, 30000);
});
