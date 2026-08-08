import type { Logger } from "pino";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const REVALIDATE_QUEUE_NAME = "revalidate";
export const ASSET_QUARANTINE_QUEUE_NAME = "asset-quarantine";

let connection: IORedis | null | undefined;
const queues = new Map<string, Queue>();

function getConnection(): IORedis | null {
  if (connection !== undefined) return connection;
  const url = process.env.REDIS_URL;
  connection = url ? new IORedis(url, { maxRetriesPerRequest: null }) : null;
  return connection;
}

function getQueue(name: string): Queue | null {
  const redis = getConnection();
  if (!redis) return null;
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: redis });
    queues.set(name, queue);
  }
  return queue;
}

export async function enqueueCrossWorkerJob(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  log: Logger,
): Promise<void> {
  const queue = getQueue(queueName);
  if (!queue) {
    log.warn({ queueName, jobName }, "not enqueuing this job — REDIS_URL is unset, so the queue is off");
    return;
  }
  await queue.add(jobName, data);
}
