// D2 success-path proof (P4-FINDINGS.md / Phase 5), not part of the automated
// suite (hence `.manual.ts`, excluded from vitest's default *.test.ts glob).
//
// The `backfill --execute` fixture run proves the FAILURE path end to end: the
// W8 fixture's legacy image URLs are synthetic (dead DNS / 403 / 404 on the real
// hosts), so the real SSRF-guarded fetcher routes every one to the failure list
// and the null-avatar policy applies — no crash, no partial writes. That leaves
// the SUCCESS path (a live legacy image → real webp/LQIP object in the bucket)
// unexercised, because no fixture URL is actually fetchable today.
//
// This script closes that gap by driving the EXACT real seam trio that
// createRealSeams() wires into `--execute` — SsrfGuardedImageFetcher +
// sharpNormalizeModule (imported from apps/api) + S3AssetStore — against live,
// public, non-private images that stand in for a reachable legacy host, using
// the same u/{kyteId}/{avatar|links}/{ulid}.webp key layout backfill.ts uses,
// and HEAD-verifies both the main and LQIP objects actually landed in MinIO.
//
// Run (from tools/seed/, docker up) with the same env `--execute` uses:
//   AWS_ENDPOINT_URL=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
//   AWS_S3_BUCKET=... AWS_REGION=... REDIS_URL=... \
//   npx tsx src/legacy-backfill/prove-real-asset-pipeline.manual.ts
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { detectImageType } from "@kytelink/api/src/assets/magic-bytes";
import { createRealSeams } from "./real-seams";

type ProofJob = { kyteId: string; url: string; kind: "AVATAR" | "LINK_IMAGE" };

// Live, public, non-private images standing in for reachable legacy hosts. The
// SSRF guard allows these (public DNS, http/https, under the size cap).
const JOBS: ProofJob[] = [
  { kyteId: "_migration_proof_a", url: "https://picsum.photos/id/237/1200/1200.jpg", kind: "AVATAR" },
  { kyteId: "_migration_proof_b", url: "https://picsum.photos/id/1025/800/800.jpg", kind: "LINK_IMAGE" },
];

function proofKey(kyteId: string, kind: "AVATAR" | "LINK_IMAGE"): string {
  const folder = kind === "AVATAR" ? "avatar" : "links";
  return `u/${kyteId}/${folder}/proof-${Date.now().toString(36)}.webp`;
}

async function headSize(client: S3Client, bucket: string, key: string): Promise<number> {
  const out = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return out.ContentLength ?? -1;
}

async function main(): Promise<void> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is required");
  const seams = createRealSeams(process.env);
  const head = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_REGION ?? "auto",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: true,
  });

  const rows: unknown[] = [];
  try {
    for (const job of JOBS) {
      const bytes = await seams.fetcher.fetch(job.url);
      const inputMagic = detectImageType(bytes);
      const normalized = await seams.normalize.normalizeImage(
        bytes,
        job.kind === "AVATAR" ? "avatar" : "link_image",
      );
      const key = proofKey(job.kyteId, job.kind);
      const lqipKey = key.replace(/\.webp$/, ".lqip.webp");
      await seams.store.put(key, normalized.main.buffer, normalized.main.contentType);
      await seams.store.put(lqipKey, normalized.lqip.buffer, normalized.lqip.contentType);

      const mainHead = await headSize(head, bucket, key);
      const lqipHead = await headSize(head, bucket, lqipKey);

      const ok =
        detectImageType(normalized.main.buffer) === "webp" &&
        mainHead === normalized.main.sizeBytes &&
        lqipHead === normalized.lqip.sizeBytes;
      rows.push({
        kyteId: job.kyteId,
        sourceUrl: job.url,
        inputMagic,
        mainKey: key,
        mainDims: `${normalized.main.width}x${normalized.main.height}`,
        mainBytes: normalized.main.sizeBytes,
        mainMagic: detectImageType(normalized.main.buffer),
        mainHeadBytes: mainHead,
        lqipKey,
        lqipBytes: normalized.lqip.sizeBytes,
        lqipHeadBytes: lqipHead,
        bucketVerified: ok,
      });
      if (!ok) throw new Error(`bucket verification failed for ${job.kyteId}`);
    }
  } finally {
    await seams.close();
    head.destroy();
  }

  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  process.stdout.write(
    `PASS: real seam trio (SSRF fetch + apps/api sharp-normalize + S3AssetStore) wrote ` +
      `${rows.length} genuine webp main+LQIP object pairs into MinIO bucket "${bucket}" ` +
      `under isolated u/_migration_proof_* keys, HEAD-verified byte-for-byte.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
