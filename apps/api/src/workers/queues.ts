import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import { getRedis } from "../redis";

export type QueueName =
  | "revalidate"
  | "moderation"
  | "image-process"
  | "og-image"
  | "asset-quarantine"
  | "sitemap"
  | "cleanup"
  | "domain-reaper";

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    queues.set(name, queue);
  }
  return queue;
}

export interface RevalidateJob {
  paths: string[];
  reason: string;
}

/**
 * Deterministic BullMQ jobId from the path set so identical revalidations
 * (the publish hook + the og-image worker both target `/{username}` on every
 * publish, H9) coalesce into one job while a prior one is still queued — BullMQ
 * rejects a duplicate id rather than fanning out a second signed POST to web.
 * BullMQ forbids `:` in custom job ids, so the path set is hashed to hex.
 */
export function revalidateJobId(paths: string[]): string {
  const digest = createHash("sha1").update([...paths].sort().join("|")).digest("hex");
  return `revalidate-${digest}`;
}

const SITEMAP_REFRESH_DELAY_MS = 60_000;

// The fixed jobId plus the delay collapse a burst of transitions into one
// regeneration. removeOnComplete/removeOnFail must override the queue defaults:
// BullMQ dedupes against retained terminal jobs, so the id would otherwise fire
// exactly once ever.
export async function enqueueSitemapRefresh(reason: string): Promise<void> {
  await getQueue("sitemap").add(
    "refresh",
    { reason },
    {
      jobId: "sitemap-refresh",
      delay: SITEMAP_REFRESH_DELAY_MS,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
}

export async function enqueueRevalidate(job: RevalidateJob): Promise<string> {
  if (job.paths.length === 0) return "";
  const added = await getQueue("revalidate").add("revalidate", job, {
    jobId: revalidateJobId(job.paths),
  });
  return added.id ?? "";
}
