// Phase-5 quarantine round-trip demo (08-media.md u/{kyteId} <-> q/{kyteId}),
// not part of the automated suite (`.manual.ts`). Drives the REAL asset
// quarantine worker (processQuarantineJob, imported from apps/api) against the
// real MinIO bucket: seeds two live objects under u/_quarantine_demo/, runs the
// suspension move (u/ -> q/), verifies the live prefix is empty and the
// quarantine prefix holds them, then runs the unsuspend restore (q/ -> u/) and
// verifies the round-trip landed them back. This is the exact code path an
// admin suspend/unsuspend (and the seed-sweep's suspending verdict) enqueues.
//
// Run (from tools/seed/, docker up) with the same AWS_* env `--execute` uses:
//   npx tsx src/legacy-backfill/demo-quarantine.manual.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { processQuarantineJob } from "@kytelink/api/src/assets/quarantine-worker";
import { getS3Client, getBucketName, listObjectsByPrefix } from "@kytelink/api/src/assets/s3-client";

const KYTE = "_quarantine_demo";
const OBJECTS = [
  { key: `u/${KYTE}/avatar/demo.webp`, body: new Uint8Array([1, 2, 3, 4]) },
  { key: `u/${KYTE}/links/demo.webp`, body: new Uint8Array([5, 6, 7, 8]) },
];

async function seed(): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  for (const obj of OBJECTS) {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: obj.key, Body: obj.body, ContentType: "image/webp" }));
  }
}

async function counts(): Promise<{ live: string[]; quarantine: string[] }> {
  return {
    live: await listObjectsByPrefix(`u/${KYTE}/`),
    quarantine: await listObjectsByPrefix(`q/${KYTE}/`),
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

async function main(): Promise<void> {
  await seed();
  const before = await counts();
  process.stdout.write(`seeded: live=${before.live.length} quarantine=${before.quarantine.length}\n`);
  assert(before.live.length === 2 && before.quarantine.length === 0, "two live objects, zero quarantined at start");

  const suspend = await processQuarantineJob({ kyteId: KYTE, direction: "quarantine" });
  const afterSuspend = await counts();
  process.stdout.write(`after SUSPEND (u/ -> q/): moved=${suspend.moved}/${suspend.total} live=${afterSuspend.live.length} quarantine=${afterSuspend.quarantine.length}\n`);
  process.stdout.write(`  quarantined keys: ${afterSuspend.quarantine.join(", ")}\n`);
  assert(afterSuspend.live.length === 0 && afterSuspend.quarantine.length === 2, "all objects moved to q/ prefix on suspend");

  const restore = await processQuarantineJob({ kyteId: KYTE, direction: "restore" });
  const afterRestore = await counts();
  process.stdout.write(`after RESTORE (q/ -> u/): moved=${restore.moved}/${restore.total} live=${afterRestore.live.length} quarantine=${afterRestore.quarantine.length}\n`);
  process.stdout.write(`  live keys: ${afterRestore.live.join(", ")}\n`);
  assert(afterRestore.live.length === 2 && afterRestore.quarantine.length === 0, "all objects restored to u/ prefix on unsuspend");

  // Idempotency: a repeated restore with nothing left at the source is a no-op.
  const repeat = await processQuarantineJob({ kyteId: KYTE, direction: "restore" });
  process.stdout.write(`repeat RESTORE (idempotent no-op): moved=${repeat.moved}/${repeat.total}\n`);
  assert(repeat.moved === 0 && repeat.total === 0, "second restore is a no-op");

  process.stdout.write(
    "PASS: suspension quarantine round-trips (u/ -> q/ on suspend, q/ -> u/ on unsuspend) with byte objects in real MinIO; move is idempotent.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
