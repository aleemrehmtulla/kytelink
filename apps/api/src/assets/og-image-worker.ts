import { createHash } from "node:crypto";
import { Queue, Worker, type Job } from "bullmq";
import sharp from "sharp";
import { ulid } from "ulid";
import type { ThemeKey } from "@kytelink/schemas";
import type { Store } from "../store/store";
import { taggedLogger } from "../logger";
import { buildOgKey } from "./keys";
import { deleteObject, getObjectBuffer, putObject } from "./s3-client";
import { renderOgImagePng } from "./og-image";
import { repositoryFor, type AssetRow } from "./repository";
import { getAssetsRedisConnection, isRedisConfigured } from "./redis-connection";
import { imageProcessConcurrency } from "./image-process-queue";
import { enqueueRevalidate } from "./revalidate";

const log = taggedLogger("assets");

interface OgImageJobInput {
  kyteId: string;
  displayName: string;
  username: string;
  theme: ThemeKey;
  avatarKey?: string;
}

interface OgImageJobResult {
  assetId: string;
  key: string;
  skipped: boolean;
}

function contentHashFor(input: OgImageJobInput): string {
  const payload = JSON.stringify({
    displayName: input.displayName,
    username: input.username,
    theme: input.theme,
    avatarKey: input.avatarKey ?? null,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function loadAvatarPngBase64(avatarKey: string | undefined): Promise<string | undefined> {
  if (!avatarKey) return undefined;
  const webp = await getObjectBuffer(avatarKey);
  const png = await sharp(webp).png().toBuffer();
  return png.toString("base64");
}

/**
 * Renders and stores the per-kyte OG card, keyed by contentHash, deleting the
 * previous OG object + Asset row in the same job — exactly one OG asset per
 * kyte at any time (08-media.md).
 */
export async function processOgImageJob(
  store: Store,
  input: OgImageJobInput,
): Promise<OgImageJobResult> {
  const repo = repositoryFor(store);
  const previous = await repo.findOgAssetForKyte(input.kyteId);
  const key = buildOgKey(input.kyteId, contentHashFor(input));

  if (previous && previous.key === key) {
    return { assetId: previous.id, key, skipped: true };
  }

  const avatarPngBase64 = await loadAvatarPngBase64(input.avatarKey);
  const png = await renderOgImagePng({
    displayName: input.displayName,
    username: input.username,
    theme: input.theme,
    avatarPngBase64,
  });

  await putObject(key, png, "image/png");

  if (previous) {
    await deleteObject(previous.key).catch((error: unknown) => {
      log.warn({ err: error, key: previous.key }, "could not delete the previous OG image — it is now orphaned in the bucket");
    });
    await repo.removeAsset(previous.id);
  }

  const assetId = ulid();
  const row: AssetRow = {
    id: assetId,
    kyteId: input.kyteId,
    uploadedById: null,
    key,
    kind: "OG_IMAGE",
    contentType: "image/png",
    sizeBytes: png.byteLength,
    width: 1200,
    height: 630,
    createdAt: new Date(),
  };
  await repo.insertAsset(row);

  await enqueueRevalidate(input.username ? [`/${input.username}`] : []);

  return { assetId, key, skipped: false };
}

const OG_IMAGE_QUEUE_NAME = "og-image";

let cachedQueue: Queue<OgImageJobInput> | null = null;

function getOgImageQueue(): Queue<OgImageJobInput> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<OgImageJobInput>(OG_IMAGE_QUEUE_NAME, {
    connection: getAssetsRedisConnection(),
  });
  return cachedQueue;
}

export async function enqueueOgImageJob(input: OgImageJobInput): Promise<void> {
  if (!isRedisConfigured()) {
    log.debug({ kyteId: input.kyteId }, "not generating an OG image — REDIS_URL is unset, so the queue is off");
    return;
  }
  await getOgImageQueue().add("render", input, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export function createOgImageWorker(store: Store): Worker<OgImageJobInput, OgImageJobResult> {
  return new Worker<OgImageJobInput, OgImageJobResult>(
    OG_IMAGE_QUEUE_NAME,
    (job: Job<OgImageJobInput>) => processOgImageJob(store, job.data),
    { connection: getAssetsRedisConnection(), concurrency: imageProcessConcurrency },
  );
}
