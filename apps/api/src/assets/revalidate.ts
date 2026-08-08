import { Queue } from "bullmq";
import { taggedLogger } from "../logger";

const log = taggedLogger("assets");
import { revalidateJobId } from "../workers/queues";
import { getAssetsRedisConnection, isRedisConfigured } from "./redis-connection";

interface RevalidateJobInput {
  paths: string[];
}

const REVALIDATE_QUEUE_NAME = "revalidate";

let cachedQueue: Queue<RevalidateJobInput> | null = null;

function getRevalidateQueue(): Queue<RevalidateJobInput> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<RevalidateJobInput>(REVALIDATE_QUEUE_NAME, {
    connection: getAssetsRedisConnection(),
  });
  return cachedQueue;
}

/**
 * Shares the "revalidate" queue name with the dedicated worker by convention
 * rather than by import — this module only ever produces onto the queue.
 */
export async function enqueueRevalidate(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (!isRedisConfigured()) {
    log.debug({ paths }, "not revalidating these paths — REDIS_URL is unset, so the queue is off");
    return;
  }
  await getRevalidateQueue().add("revalidate", { paths }, { jobId: revalidateJobId(paths) });
}
