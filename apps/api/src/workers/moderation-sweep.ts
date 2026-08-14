import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { createPrismaModerationStore, createProviderFromEnv, runSeedSweep } from "../moderation";
import { writeSweepProgress, type ModerationSweepProgress } from "../moderation/sweep-progress";
import type { SweepStatusChange, SweepTally } from "../moderation/seed-sweep";
import type { ModerationProvider, ModerationStore } from "../moderation/types";
import { taggedLogger } from "../logger";
import { afterModerationChange } from "../publish-hooks";
import { getRedis } from "../redis";
import { enqueueSitemapRefresh, getQueue } from "./queues";

export const MODERATION_SWEEP_QUEUE_NAME = "moderation-sweep";

// One fixed id is the whole single-flight mechanism: BullMQ refuses a job whose
// id already exists, so a double-click cannot start a second sweep.
// removeOnComplete/removeOnFail must be set or the retained terminal job would
// hold that id forever and the button would fire exactly once ever.
export const MODERATION_SWEEP_JOB_ID = "moderation-sweep-all";

const PROGRESS_EVERY = 10;

export interface ModerationSweepJob {
  requestedBy: string;
}

const EMPTY_TALLY: SweepTally = {
  total: 0,
  processed: 0,
  reviewed: 0,
  suspended: 0,
  approved: 0,
  skipped: 0,
  failed: 0,
};

export async function enqueueModerationSweep(requestedBy: string): Promise<void> {
  await getQueue(MODERATION_SWEEP_QUEUE_NAME).add(
    "sweep",
    { requestedBy },
    {
      jobId: MODERATION_SWEEP_JOB_ID,
      // A retry would re-review every kyte from the top at full provider cost;
      // the sweep already absorbs per-kyte failures itself.
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
}

/** True while the single-flight job is waiting or running. */
export async function isModerationSweepQueued(): Promise<boolean> {
  const job = await getQueue(MODERATION_SWEEP_QUEUE_NAME).getJob(MODERATION_SWEEP_JOB_ID);
  return job !== undefined;
}

export function initialSweepProgress(total: number, requestedBy: string): ModerationSweepProgress {
  return {
    ...EMPTY_TALLY,
    total,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    requestedBy,
  };
}

export interface ModerationSweepDeps {
  store?: ModerationStore;
  provider?: ModerationProvider;
  redis?: Redis;
  log?: Logger;
  applyChanges?: (changes: SweepStatusChange[]) => Promise<void>;
}

async function applyStatusChanges(changes: SweepStatusChange[]): Promise<void> {
  for (const change of changes) {
    await afterModerationChange(change.kyteId, change.username, change.suspended);
  }
}

/**
 * Re-reviews every published kyte and leaves the caches consistent. The v1→v2
 * import wrote published rows straight into the database, so those kytes never
 * passed through the publish hook that enqueues a moderation scan.
 */
export async function runModerationSweep(
  requestedBy: string,
  deps: ModerationSweepDeps = {},
): Promise<ModerationSweepProgress> {
  const log = deps.log ?? taggedLogger("moderation");
  const redis = deps.redis ?? getRedis();
  const store = deps.store ?? createPrismaModerationStore(log);
  const provider = deps.provider ?? createProviderFromEnv();
  const startedAt = new Date().toISOString();

  function snapshot(tally: SweepTally, finishedAt: string | null): ModerationSweepProgress {
    return { ...tally, startedAt, finishedAt, requestedBy };
  }

  let progress = snapshot(EMPTY_TALLY, null);

  try {
    const { changed, ...tally } = await runSeedSweep(store, provider, log, {
      reviewedBy: `admin-sweep:${requestedBy}`,
      progressEvery: PROGRESS_EVERY,
      onProgress: async (running) => {
        progress = snapshot(running, null);
        await writeSweepProgress(redis, progress);
      },
    });
    progress = snapshot(tally, null);

    await (deps.applyChanges ?? applyStatusChanges)(changed);
    if (changed.length > 0) {
      // A long sweep outlives the 60s-delayed refresh its first suspension
      // queued, so the sitemap gets one more pass over the finished state.
      await enqueueSitemapRefresh("admin-sweep");
    }
    log.info({ ...tally, changed: changed.length, requestedBy }, "admin moderation sweep finished");
  } finally {
    progress = { ...progress, finishedAt: new Date().toISOString() };
    await writeSweepProgress(redis, progress);
  }

  return progress;
}

export function createModerationSweepWorker(): Worker<ModerationSweepJob> {
  return new Worker<ModerationSweepJob>(
    MODERATION_SWEEP_QUEUE_NAME,
    async (job) => {
      await runModerationSweep(job.data.requestedBy);
    },
    { connection: getRedis(), concurrency: 1 },
  );
}
