import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pino from "pino";
import { createFakeModerationStore } from "../moderation/fake-store";
import { buildSnapshot } from "../moderation/fixtures";
import { createNoneProvider } from "../moderation/provider-none";
import {
  readSweepProgress,
  requestSweepCancel,
  SWEEP_CANCEL_KEY,
  SWEEP_PROGRESS_KEY,
  writeSweepProgress,
  type ModerationSweepProgress,
} from "../moderation/sweep-progress";
import type { ModerationProvider } from "../moderation/types";
import { getRedis } from "../redis";
import { acquireSuiteLock } from "../test/redis-suite-lock";
import {
  enqueueModerationSweep,
  initialSweepProgress,
  isModerationSweepQueued,
  MODERATION_SWEEP_JOB_ID,
  MODERATION_SWEEP_QUEUE_NAME,
  removeQueuedModerationSweep,
  runModerationSweep,
} from "./moderation-sweep";
import { getQueue } from "./queues";

const log = pino({ level: "silent" });
const REQUESTED_BY = "agent-admin@kytelink.dev";

/** Suspensions only ever come from an AI verdict now, so the sweep is tested through one. */
function providerSuspending(...kyteIds: string[]): ModerationProvider {
  return {
    name: "openai",
    review: (snapshot) =>
      Promise.resolve(
        kyteIds.includes(snapshot.kyteId)
          ? {
              verdict: "SUSPEND" as const,
              categories: ["phishing"],
              confidence: 0.95,
              reason: "confirmed phishing page",
              signals: {},
            }
          : {
              verdict: "APPROVE" as const,
              categories: [],
              confidence: 0.99,
              reason: "ordinary profile",
              signals: {},
            },
      ),
  };
}

function snapshots(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildSnapshot({ kyteId: `sweep_${index}`, username: `sweepuser${index}` }),
  );
}

let releaseSuiteLock: (() => Promise<void>) | undefined;

// Shares the sweep progress keys and bull queue with admin-sweep.test.ts —
// the two files must not run at the same time.
beforeAll(async () => {
  releaseSuiteLock = await acquireSuiteLock("moderation-sweep");
});

afterEach(async () => {
  await getRedis().del(SWEEP_PROGRESS_KEY, SWEEP_CANCEL_KEY);
});

afterAll(async () => {
  await releaseSuiteLock?.();
  await getQueue(MODERATION_SWEEP_QUEUE_NAME)
    .close()
    .catch(() => undefined);
  await getQueue("sitemap")
    .close()
    .catch(() => undefined);
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

  it("keeps the blob moving while a slow sweep runs", async () => {
    const store = createFakeModerationStore(snapshots(400));
    const redis = getRedis();
    const slow: ModerationProvider = {
      name: "none",
      review: async (snapshot) => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return createNoneProvider().review(snapshot);
      },
    };

    const samples: number[] = [];
    const sampler = setInterval(() => {
      void readSweepProgress(redis).then((p) => {
        if (p && p.finishedAt === null) samples.push(p.processed);
      });
    }, 50);

    try {
      await runModerationSweep(REQUESTED_BY, {
        store,
        provider: slow,
        log,
        applyChanges: () => Promise.resolve(),
      });
    } finally {
      clearInterval(sampler);
    }

    // Sampled at 20Hz over a run of several hundred ms: the blob has to have
    // advanced between samples, not sat on its opening frame.
    expect(samples.length).toBeGreaterThan(1);
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  it("streams a recent-activity feed of what it just decided", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "sweep_ok", username: "okuser" }),
      buildSnapshot({ kyteId: "sweep_spam", username: "spammer" }),
    ]);

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: providerSuspending("sweep_spam"),
      log,
      applyChanges: () => Promise.resolve(),
    });

    expect(final.recent).toHaveLength(2);
    const suspension = final.recent.find((entry) => entry.username === "spammer");
    expect(suspension).toMatchObject({ verdict: "SUSPEND", changed: true });
    expect(suspension?.reason.length).toBeGreaterThan(0);
    expect(await readSweepProgress(getRedis())).toEqual(final);
  });

  it("caps the feed at 15 entries in the blob it stores", async () => {
    const store = createFakeModerationStore(snapshots(40));

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: createNoneProvider(),
      log,
      applyChanges: () => Promise.resolve(),
    });

    expect(final.recent).toHaveLength(15);
    expect(await readSweepProgress(getRedis())).toMatchObject({ processed: 40 });
  });

  it("hands every kyte whose status moved to the cache-invalidation step", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "sweep_keep", username: "keep" }),
      buildSnapshot({ kyteId: "sweep_bad", username: "bad" }),
    ]);
    const applied: { kyteId: string; suspended: boolean }[] = [];

    await runModerationSweep(REQUESTED_BY, {
      store,
      provider: providerSuspending("sweep_bad"),
      log,
      applyChanges: (changes) => {
        applied.push(
          ...changes.map((c) => ({ kyteId: c.kyteId, suspended: c.suspended })),
        );
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
      await enqueueModerationSweep(REQUESTED_BY, "run_first");
      await enqueueModerationSweep("someone-else@kytelink.dev", "run_second");

      const waiting = await queue.getJobs(["waiting", "paused", "active", "delayed"]);
      expect(waiting.map((job) => job.id)).toEqual([MODERATION_SWEEP_JOB_ID]);
      expect(waiting[0]?.data).toEqual({ requestedBy: REQUESTED_BY, runId: "run_first" });
      expect(await isModerationSweepQueued()).toBe(true);

      await waiting[0]?.remove();
      expect(await isModerationSweepQueued()).toBe(false);
    } finally {
      await queue.resume();
    }
  });

  it("removeQueuedModerationSweep drops a job that never started", async () => {
    const queue = getQueue(MODERATION_SWEEP_QUEUE_NAME);
    await queue.pause();
    try {
      await enqueueModerationSweep(REQUESTED_BY, "run_waiting");
      expect(await isModerationSweepQueued()).toBe(true);

      expect(await removeQueuedModerationSweep()).toBe(true);
      expect(await isModerationSweepQueued()).toBe(false);
      // Nothing queued is not an error — cancelling twice must stay harmless.
      expect(await removeQueuedModerationSweep()).toBe(false);
    } finally {
      await queue.resume();
    }
  });
});

describe("moderation sweep cancellation", () => {
  it("stops claiming, keeps its partial tally, and records who cancelled it", async () => {
    const store = createFakeModerationStore(snapshots(400));
    const redis = getRedis();
    const runId = "run_cancel_me";
    let seen = 0;
    // Slow enough that the run outlives a progress frame — the cancel flag is
    // read on the progress cadence, so an instant sweep would finish first.
    const slow: ModerationProvider = {
      name: "none",
      review: async (snapshot) => {
        seen += 1;
        if (seen === 16) {
          await requestSweepCancel(redis, { runId, by: "boss@kytelink.dev" });
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
        return createNoneProvider().review(snapshot);
      },
    };

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: slow,
      log,
      runId,
      applyChanges: () => Promise.resolve(),
    });

    expect(final.state).toBe("cancelled");
    expect(final.cancelledBy).toBe("boss@kytelink.dev");
    expect(final.finishedAt).not.toBeNull();
    expect(final.processed).toBeGreaterThan(0);
    expect(final.processed).toBeLessThan(400);
    // Everything it did claim was actually reviewed — cancelling drains, it
    // does not abandon work half-done.
    expect(final.reviewed + final.skipped + final.failed).toBe(final.processed);
    expect(store.reviews).toHaveLength(final.reviewed);
    expect(await readSweepProgress(redis)).toEqual(final);
  });

  it("ignores a cancel flag left behind by a different run", async () => {
    const store = createFakeModerationStore(snapshots(30));
    const redis = getRedis();
    await requestSweepCancel(redis, { runId: "run_that_already_ended", by: "ghost@kytelink.dev" });

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: createNoneProvider(),
      log,
      runId: "run_brand_new",
      applyChanges: () => Promise.resolve(),
    });

    expect(final.state).toBe("finished");
    expect(final.cancelledBy).toBeNull();
    expect(final.processed).toBe(30);
    // The stale request is left where it was — consuming another run's flag is
    // not this run's call to make.
    expect(await redis.get(SWEEP_CANCEL_KEY)).not.toBeNull();
  });

  it("takes over a blob stranded by an interrupted run", async () => {
    const store = createFakeModerationStore(snapshots(5));
    const redis = getRedis();
    await writeSweepProgress(redis, {
      ...initialSweepProgress(9999, "someone-else@kytelink.dev", "run_that_died"),
      processed: 4200,
    });

    const final = await runModerationSweep(REQUESTED_BY, {
      store,
      provider: createNoneProvider(),
      log,
      runId: "run_takeover",
      applyChanges: () => Promise.resolve(),
    });

    expect(final.runId).toBe("run_takeover");
    expect(final.state).toBe("finished");
    expect(final.total).toBe(5);
    expect(final.processed).toBe(5);
  });
});
