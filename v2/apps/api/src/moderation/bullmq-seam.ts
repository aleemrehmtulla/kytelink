import type { KytePublishedEvent, ModerationSeam } from "../seams/moderation-seam";
import { getQueue } from "../workers/queues";

export const MODERATION_QUEUE_NAME = "moderation";

export interface ModerationScanJob {
  kyteId: string;
  publishSeq: number;
}

/**
 * The publish pipeline's moderation seam: enqueues a scan onto the durable
 * BullMQ `moderation` queue (attempts + exponential backoff + dead-letter come
 * from the shared queue defaults) instead of the in-process ConcurrencyQueue,
 * so a restart never drops a pending scan (M4, 06-api.md). The scan itself is
 * run by the moderation worker; the deterministic + AI logic is unchanged.
 */
export function createBullmqModerationSeam(): ModerationSeam {
  return {
    async enqueueKyteScan(event: KytePublishedEvent): Promise<void> {
      const data: ModerationScanJob = { kyteId: event.kyteId, publishSeq: event.publishSeq };
      // BullMQ forbids `:` in custom job ids; a scan is unique per publish.
      await getQueue(MODERATION_QUEUE_NAME).add("scan", data, {
        jobId: `scan-${event.kyteId}-${event.publishSeq}`,
      });
    },
  };
}
