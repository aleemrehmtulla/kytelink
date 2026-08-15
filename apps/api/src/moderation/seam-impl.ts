import type { Logger } from "pino";
import type { KytePublishedEvent, ModerationSeam } from "../seams/moderation-seam";
import type { ConcurrencyQueue } from "./concurrency-queue";
import { createConcurrencyQueue } from "./concurrency-queue";
import { getScanConcurrency } from "./moderation-env";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

interface CreateModerationSeamOptions {
  store: ModerationStore;
  provider: ModerationProvider;
  log: Logger;
  queue?: ConcurrencyQueue;
  concurrency?: number;
}

export function createModerationSeam(options: CreateModerationSeamOptions): ModerationSeam {
  const queue = options.queue ?? createConcurrencyQueue(options.concurrency ?? getScanConcurrency());

  return {
    enqueueKyteScan(event: KytePublishedEvent): Promise<void> {
      return queue.run(async () => {
        await reviewKyte(
          options.store,
          options.provider,
          { kyteId: event.kyteId, publishSeq: event.publishSeq, reviewedBy: null },
          options.log,
        );
      });
    },
  };
}
