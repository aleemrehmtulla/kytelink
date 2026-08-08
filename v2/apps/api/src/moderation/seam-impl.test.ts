import { describe, expect, it } from "vitest";
import pino from "pino";
import { registerModerationSeam, onKytePublished } from "../seams/moderation-seam";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { createModerationSeam } from "./seam-impl";

const log = pino({ level: "silent" });

describe("createModerationSeam", () => {
  it("matches the frozen ModerationSeam shape and can be registered via registerModerationSeam", async () => {
    const snapshot = buildSnapshot({ kyteId: "k_seam" });
    const store = createFakeModerationStore([snapshot]);
    const seam = createModerationSeam({ store, provider: createNoneProvider(), log });

    expect(typeof seam.enqueueKyteScan).toBe("function");
    registerModerationSeam(seam);

    onKytePublished({ kyteId: "k_seam", username: "seamuser", publishSeq: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.reviews).toHaveLength(1);
  });

  it("caps in-flight scans at the configured concurrency", async () => {
    const snapshots = [buildSnapshot({ kyteId: "k_a" }), buildSnapshot({ kyteId: "k_b" })];
    const store = createFakeModerationStore(snapshots);
    let concurrent = 0;
    let maxConcurrent = 0;
    const provider = {
      name: "none" as const,
      async review() {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent -= 1;
        return { verdict: "APPROVE" as const, categories: [], confidence: 1, reason: "ok", signals: {} };
      },
    };
    const seam = createModerationSeam({ store, provider, log, concurrency: 1 });

    await Promise.all([
      seam.enqueueKyteScan({ kyteId: "k_a", username: "a", publishSeq: 1 }),
      seam.enqueueKyteScan({ kyteId: "k_b", username: "b", publishSeq: 1 }),
    ]);

    expect(maxConcurrent).toBe(1);
  });
});
