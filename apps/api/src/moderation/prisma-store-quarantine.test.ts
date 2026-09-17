import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { createPrismaModerationStore } from "./prisma-store";
import { enqueueCrossWorkerJob } from "./queue-bridge";
import { dropProfileCache } from "../internal/data";

vi.mock("./queue-bridge", () => ({
  ASSET_QUARANTINE_QUEUE_NAME: "asset-quarantine",
  REVALIDATE_QUEUE_NAME: "revalidate",
  enqueueCrossWorkerJob: vi.fn(),
}));

vi.mock("../internal/data", () => ({ dropProfileCache: vi.fn() }));

const enqueue = vi.mocked(enqueueCrossWorkerJob);
const dropCache = vi.mocked(dropProfileCache);

// The quarantine worker switches on job.data.direction, never the job name —
// a payload without it silently no-ops the quarantine.
describe("moderation store quarantine payloads", () => {
  it("sends direction: quarantine when hiding assets", async () => {
    const store = createPrismaModerationStore(pino({ level: "silent" }));
    await store.quarantineAssets("k1");
    expect(enqueue).toHaveBeenCalledWith(
      "asset-quarantine",
      "quarantine",
      { kyteId: "k1", direction: "quarantine" },
      expect.anything(),
    );
  });

  it("sends direction: restore when unhiding assets", async () => {
    const store = createPrismaModerationStore(pino({ level: "silent" }));
    await store.unquarantineAssets("k1");
    expect(enqueue).toHaveBeenCalledWith(
      "asset-quarantine",
      "unquarantine",
      { kyteId: "k1", direction: "restore" },
      expect.anything(),
    );
  });
});

describe("moderation store revalidation", () => {
  it("drops the API profile cache before asking web to rebuild", async () => {
    dropCache.mockClear();
    enqueue.mockClear();
    const store = createPrismaModerationStore(pino({ level: "silent" }));

    await store.requestRevalidate("k1", "spammer");

    expect(dropCache).toHaveBeenCalledWith("spammer");
    expect(dropCache.mock.invocationCallOrder[0]).toBeLessThan(
      enqueue.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("lets the deterministic job id be reused for every later takedown", async () => {
    enqueue.mockClear();
    const store = createPrismaModerationStore(pino({ level: "silent" }));

    await store.requestRevalidate("k1", "spammer");

    const opts = enqueue.mock.calls[0]?.[4];
    expect(opts?.jobId).toEqual(expect.stringMatching(/^revalidate-/));
    expect(opts?.removeOnComplete).toBe(true);
    expect(opts?.removeOnFail).toBe(true);
  });
});
