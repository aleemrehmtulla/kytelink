import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { createPrismaModerationStore } from "./prisma-store";
import { enqueueCrossWorkerJob } from "./queue-bridge";

vi.mock("./queue-bridge", () => ({
  ASSET_QUARANTINE_QUEUE_NAME: "asset-quarantine",
  REVALIDATE_QUEUE_NAME: "revalidate",
  enqueueCrossWorkerJob: vi.fn(),
}));

const enqueue = vi.mocked(enqueueCrossWorkerJob);

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
