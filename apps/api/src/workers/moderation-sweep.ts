import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { createPrismaModerationStore, createProviderFromEnv, runSeedSweep } from "../moderation";
import { getSweepConcurrency } from "../moderation/moderation-env";
import {
  readSweepProgress,
  takeSweepCancel,
  writeSweepProgress,
  type ModerationSweepProgress,
} from "../moderation/sweep-progress";
import type { SweepSnapshot, SweepStatusChange } from "../moderation/seed-sweep";
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

const PROGRESS_EVERY = 5;
const LOG_EVERY = 250;

export interface ModerationSweepJob {
  requestedBy: string;
  // Optional so a job enqueued by the previous build still runs; it just gets a
  // fresh id and takes the blob over.
  runId?: string;
}

const EMPTY_SNAPSHOT: SweepSnapshot = {
  total: 0,
  processed: 0,
  reviewed: 0,
  suspended: 0,
  approved: 0,
  skipped: 0,
  failed: 0,
  recent: [],
};

export async function enqueueModerationSweep(requestedBy: string, runId: string): Promise<void> {
  await getQueue(MODERATION_SWEEP_QUEUE_NAME).add(
    "sweep",
    { requestedBy, runId },
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

/**
 * Drops the job if it has not been picked up yet, so cancelling a sweep that is
 * still queued takes effect immediately instead of waiting for it to start and
 * notice the flag. An active job cannot be removed — that one has to observe
 * the cancel flag itself — so this answers false and leaves it alone.
 */
export async function removeQueuedModerationSweep(): Promise<boolean> {
  const job = await getQueue(MODERATION_SWEEP_QUEUE_NAME).getJob(MODERATION_SWEEP_JOB_ID);
  if (!job) return false;
  const state = await job.getState();
  if (state === "active") return false;
  await job.remove().catch(() => undefined);
  return true;
}

export function initialSweepProgress(
  total: number,
  requestedBy: string,
  runId: string,
): ModerationSweepProgress {
  return {
    ...EMPTY_SNAPSHOT,
    total,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    requestedBy,
    runId,
    state: "running",
    cancelledBy: null,
  };
}

export interface ModerationSweepDeps {
  store?: ModerationStore;
  provider?: ModerationProvider;
  redis?: Redis;
  log?: Logger;
  runId?: string;
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
  const startedMs = Date.now();
  const concurrency = getSweepConcurrency();
  const runId = deps.runId ?? randomUUID();
  let cancelledBy: string | null = null;

  // Whatever is in the blob belongs to a run that is over — this job owns the
  // key now. Reading it first is only for the log line: an admin looking at a
  // stranded run wants to see that it was taken over, not silently replaced.
  const previous = await readSweepProgress(redis);
  if (previous && previous.runId !== runId && previous.finishedAt === null) {
    log.warn(
      { previousRunId: previous.runId, previousProcessed: previous.processed, runId },
      "admin moderation sweep taking over a progress blob left unfinished by an earlier run",
    );
  }

  function snapshot(
    running: SweepSnapshot,
    finishedAt: string | null,
    state: ModerationSweepProgress["state"],
  ): ModerationSweepProgress {
    return { ...running, startedAt, finishedAt, requestedBy, runId, state, cancelledBy };
  }

  function perMinute(processed: number): number {
    const elapsedMs = Date.now() - startedMs;
    return elapsedMs <= 0 ? 0 : Math.round((processed / elapsedMs) * 60_000);
  }

  let progress = snapshot(EMPTY_SNAPSHOT, null, "running");
  let loggedAt = 0;

  try {
    log.info(
      { requestedBy, runId, concurrency, provider: provider.name },
      "admin moderation sweep started",
    );
    const { changed, recent, cancelled, ...counts } = await runSeedSweep(store, provider, log, {
      reviewedBy: `admin-sweep:${requestedBy}`,
      progressEvery: PROGRESS_EVERY,
      concurrency,
      shouldCancel: async () => {
        const request = await takeSweepCancel(redis, runId);
        if (!request) return false;
        cancelledBy = request.by;
        log.warn({ runId, cancelledBy }, "admin moderation sweep cancelled — draining in-flight reviews");
        return true;
      },
      onProgress: async (running) => {
        progress = snapshot(running, null, "running");
        await writeSweepProgress(redis, progress);
        if (running.processed - loggedAt >= LOG_EVERY) {
          loggedAt = running.processed;
          log.info(
            {
              processed: running.processed,
              total: running.total,
              suspended: running.suspended,
              approved: running.approved,
              failed: running.failed,
              perMinute: perMinute(running.processed),
            },
            "admin moderation sweep progress",
          );
        }
      },
    });
    progress = snapshot({ ...counts, recent }, null, cancelled ? "cancelled" : "finished");

    // A cancelled run still applies what it did decide — those reviews are
    // written and their verdicts are real, so the caches must match them.
    await (deps.applyChanges ?? applyStatusChanges)(changed);
    if (changed.length > 0) {
      // A long sweep outlives the 60s-delayed refresh its first suspension
      // queued, so the sitemap gets one more pass over the finished state.
      await enqueueSitemapRefresh("admin-sweep");
    }
    log.info(
      {
        ...counts,
        changed: changed.length,
        requestedBy,
        runId,
        cancelledBy,
        elapsedMs: Date.now() - startedMs,
        perMinute: perMinute(counts.processed),
      },
      cancelled ? "admin moderation sweep cancelled" : "admin moderation sweep finished",
    );
  } finally {
    // A throw leaves `progress.state` at "running"; stamping finishedAt is what
    // keeps the card out of the stuck state the crash path used to produce.
    const state = progress.state === "running" ? "finished" : progress.state;
    progress = { ...progress, state, finishedAt: new Date().toISOString() };
    await writeSweepProgress(redis, progress);
  }

  return progress;
}

export function createModerationSweepWorker(): Worker<ModerationSweepJob> {
  return new Worker<ModerationSweepJob>(
    MODERATION_SWEEP_QUEUE_NAME,
    async (job) => {
      await runModerationSweep(job.data.requestedBy, { runId: job.data.runId });
    },
    { connection: getRedis(), concurrency: 1 },
  );
}
