import { Worker } from "bullmq";
import type { Logger } from "pino";
import {
  createPrismaModerationStore,
  createProviderFromEnv,
  reviewKyte,
} from "../moderation";
import { MODERATION_QUEUE_NAME, type ModerationScanJob } from "../moderation/bullmq-seam";
import type { ModerationProvider, ModerationStore } from "../moderation/types";
import { logger as defaultLogger } from "../logger";
import { getRedis } from "../redis";
import { adminAlert } from "./admin-alert";
import { enqueueSitemapRefresh } from "./queues";

const MODERATION_CONCURRENCY = 4;

export interface ModerationWorkerDeps {
  store?: ModerationStore;
  provider?: ModerationProvider;
  log?: Logger;
  // Overridable only so tests can run on an isolated queue; production always
  // uses the shared MODERATION_QUEUE_NAME.
  queueName?: string;
}

/**
 * Consumes the durable `moderation` queue: runs the deterministic + AI review
 * pipeline for each scan, concurrency-capped, with a dead-letter admin alert
 * once retries are exhausted (M4).
 */
export function createModerationWorker(deps: ModerationWorkerDeps = {}): Worker<ModerationScanJob> {
  const log = deps.log ?? defaultLogger;
  const store = deps.store ?? createPrismaModerationStore(log);
  const provider = deps.provider ?? createProviderFromEnv();

  const worker = new Worker<ModerationScanJob>(
    deps.queueName ?? MODERATION_QUEUE_NAME,
    async (job) => {
      const outcome = await reviewKyte(
        store,
        provider,
        { kyteId: job.data.kyteId, publishSeq: job.data.publishSeq, reviewedBy: null },
        log,
      );
      if (outcome.kind === "reviewed" && outcome.statusApplied) {
        await enqueueSitemapRefresh("moderation-review");
      }
    },
    { connection: getRedis(), concurrency: MODERATION_CONCURRENCY },
  );

  worker.on("failed", (job, error) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void adminAlert(
        "moderation_dead_letter",
        `Moderation scan for kyte ${job.data.kyteId} exhausted retries`,
        { kyteId: job.data.kyteId, publishSeq: job.data.publishSeq, error: error.message },
      );
    }
  });

  return worker;
}
