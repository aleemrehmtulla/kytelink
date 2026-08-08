import { Queue, Worker, type Job } from "bullmq";
import { taggedLogger } from "../logger";
import {
  liveKeyFor,
  liveKyteObjectPrefix,
  quarantineKeyFor,
  quarantineKyteObjectPrefix,
} from "./keys";
import { copyObject, deleteObject, listObjectsByPrefix, objectExists } from "./s3-client";
import { getAssetsRedisConnection, isRedisConfigured } from "./redis-connection";

const log = taggedLogger("assets");

type QuarantineDirection = "quarantine" | "restore";

interface QuarantineJobInput {
  kyteId: string;
  direction: QuarantineDirection;
}

interface QuarantineJobResult {
  moved: number;
  total: number;
}

/**
 * Moves every object under u/{kyteId}/ <-> q/{kyteId}/ via server-side
 * copy+delete. Asset.key stays canonical (u/...) — this only touches bucket
 * objects, never the Asset rows. Idempotent/resumable: re-running after a
 * partial failure just re-lists whichever prefix still has objects left.
 */
export async function processQuarantineJob(input: QuarantineJobInput): Promise<QuarantineJobResult> {
  const sourcePrefix =
    input.direction === "quarantine"
      ? liveKyteObjectPrefix(input.kyteId)
      : quarantineKyteObjectPrefix(input.kyteId);
  const mapKey = input.direction === "quarantine" ? quarantineKeyFor : liveKeyFor;

  const sourceKeys = await listObjectsByPrefix(sourcePrefix);
  let moved = 0;

  for (const sourceKey of sourceKeys) {
    const destinationKey = mapKey(sourceKey);
    const alreadyAtDestination = await objectExists(destinationKey);
    if (!alreadyAtDestination) {
      await copyObject(sourceKey, destinationKey);
    }
    await deleteObject(sourceKey).catch((error: unknown) => {
      log.warn({ err: error, sourceKey }, "copied the asset to quarantine but could not delete the original");
    });
    moved += 1;
  }

  return { moved, total: sourceKeys.length };
}

const QUARANTINE_QUEUE_NAME = "asset-quarantine";

let cachedQueue: Queue<QuarantineJobInput> | null = null;

function getAssetQuarantineQueue(): Queue<QuarantineJobInput> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<QuarantineJobInput>(QUARANTINE_QUEUE_NAME, {
    connection: getAssetsRedisConnection(),
  });
  return cachedQueue;
}

export async function enqueueQuarantineJob(input: QuarantineJobInput): Promise<void> {
  if (!isRedisConfigured()) {
    log.debug({ kyteId: input.kyteId }, "not quarantining this asset — REDIS_URL is unset, so the queue is off");
    return;
  }
  await getAssetQuarantineQueue().add("move", input, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export function createAssetQuarantineWorker(): Worker<QuarantineJobInput, QuarantineJobResult> {
  return new Worker<QuarantineJobInput, QuarantineJobResult>(
    QUARANTINE_QUEUE_NAME,
    (job: Job<QuarantineJobInput>) => processQuarantineJob(job.data),
    { connection: getAssetsRedisConnection(), concurrency: 2 },
  );
}
