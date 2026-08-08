import type { Logger } from "pino";
import type { KytePublishedEvent, ModerationSeam } from "../seams/moderation-seam";
import type { ConcurrencyQueue } from "./concurrency-queue";
import { createConcurrencyQueue } from "./concurrency-queue";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

const DEFAULT_QUEUE_CONCURRENCY = 4;

interface CreateModerationSeamOptions {
  store: ModerationStore;
  provider: ModerationProvider;
  log: Logger;
  queue?: ConcurrencyQueue;
  concurrency?: number;
}

export function createModerationSeam(options: CreateModerationSeamOptions): ModerationSeam {
  const queue = options.queue ?? createConcurrencyQueue(options.concurrency ?? DEFAULT_QUEUE_CONCURRENCY);

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
