import { afterAll, afterEach, describe, expect, it } from "vitest";
import pino from "pino";
import { createFakeModerationStore } from "../moderation/fake-store";
import { buildSnapshot } from "../moderation/fixtures";
import { createNoneProvider } from "../moderation/provider-none";
import {
  readSweepProgress,
  SWEEP_PROGRESS_KEY,
  type ModerationSweepProgress,
} from "../moderation/sweep-progress";
import type { ModerationProvider } from "../moderation/types";
import { getRedis } from "../redis";
import {
  enqueueModerationSweep,
  isModerationSweepQueued,
  MODERATION_SWEEP_JOB_ID,
  MODERATION_SWEEP_QUEUE_NAME,
  runModerationSweep,
} from "./moderation-sweep";
import { getQueue } from "./queues";

const log = pino({ level: "silent" });
const REQUESTED_BY = "agent-admin@kytelink.dev";

function snapshots(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildSnapshot({ kyteId: `sweep_${index}`, username: `sweepuser${index}` }),
  );
}

afterEach(async () => {
  await getRedis().del(SWEEP_PROGRESS_KEY);
});

afterAll(async () => {
  await getQueue(MODERATION_SWEEP_QUEUE_NAME).close().catch(() => undefined);
  await getQueue("sitemap").close().catch(() => undefined);
});

describe("runModerationSweep", () => {
  it("publishes progress to Redis while it runs and stamps the finish", async () => {
    const store = createFakeModerationStore(snapshots(25));
    const redis = getRedis();
    const seen: (ModerationSweepProgress | null)[] = [];
    const watchingProvider: ModerationProvider = {
      name: "none",
      review: async (snapshot) => {
        seen.push(await readSweepProgress(redis));
        return createNoneProvider().review(snapshot);
      },
    };

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: watchingProvider,
      log,
      applyChanges: () => Promise.resolve(),
    });

    expect(seen[0]).toMatchObject({ total: 25, processed: 0, finishedAt: null });
    expect(seen.some((p) => p?.processed === 10 && p.finishedAt === null)).toBe(true);
    expect(seen.some((p) => p?.processed === 20 && p.finishedAt === null)).toBe(true);

    expect(final).toMatchObject({
      total: 25,
      processed: 25,
      reviewed: 25,
      approved: 25,
      requestedBy: REQUESTED_BY,
    });
    expect(final.finishedAt).not.toBeNull();
    expect(await readSweepProgress(redis)).toEqual(final);
  });

  it("hands every kyte whose status moved to the cache-invalidation step", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "sweep_keep", username: "keep" }),
      buildSnapshot({ kyteId: "sweep_bad", username: "bad", displayName: "Rogers Support" }),
    ]);
    const applied: { kyteId: string; suspended: boolean }[] = [];

    await runModerationSweep(REQUESTED_BY, {
      store,
      provider: createNoneProvider(),
      log,
      applyChanges: (changes) => {
        applied.push(...changes.map((c) => ({ kyteId: c.kyteId, suspended: c.suspended })));
        return Promise.resolve();
      },
    });

    expect(applied).toEqual([{ kyteId: "sweep_bad", suspended: true }]);
  });

  it("marks the run finished even when the sweep blows up", async () => {
    const store = createFakeModerationStore(snapshots(1));
    store.listAllPublishedForSweep = () => Promise.reject(new Error("database is gone"));

    await expect(
      runModerationSweep(REQUESTED_BY, { store, provider: createNoneProvider(), log }),
    ).rejects.toThrow("database is gone");

    const progress = await readSweepProgress(getRedis());
    expect(progress?.finishedAt).not.toBeNull();
  });
});

describe("moderation sweep single-flight", () => {
  it("collapses a double-click into one queued job", async () => {
    const queue = getQueue(MODERATION_SWEEP_QUEUE_NAME);
    // Paused so a worker in a dev/agent stack cannot claim the probe job while
    // the assertions run; the finally block always hands the queue back.
    await queue.pause();
    try {
      await enqueueModerationSweep(REQUESTED_BY);
      await enqueueModerationSweep("someone-else@kytelink.dev");

      const waiting = await queue.getJobs(["waiting", "paused", "active", "delayed"]);
      expect(waiting.map((job) => job.id)).toEqual([MODERATION_SWEEP_JOB_ID]);
      expect(waiting[0]?.data).toEqual({ requestedBy: REQUESTED_BY });
      expect(await isModerationSweepQueued()).toBe(true);

      await waiting[0]?.remove();
      expect(await isModerationSweepQueued()).toBe(false);
    } finally {
      await queue.resume();
    }
  });
});
