import { Worker, type Job } from "bullmq";
import { getDb, type PrismaClient } from "@kytelink/db";
import { taggedLogger } from "../logger";
import { getRedis } from "../redis";
import { getQueue } from "./queues";

const log = taggedLogger("cleanup");

const CLEANUP_QUEUE_NAME = "cleanup";
// Responded invites are kept for two weeks for audit before pruning.
const RESPONDED_INVITE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

export interface CleanupResult {
  expiredSessions: number;
  expiredVerifications: number;
  expiredInvites: number;
  prunedInvites: number;
  orphanedAssets: number;
}

/**
 * Nightly housekeeping (06-api.md): prunes expired sessions, OTP/verification
 * rows, and orphaned assets, and moves overdue PENDING invites to EXPIRED.
 * Every step is idempotent — a second run finds nothing left. Preview links are
 * not pruned: there is one per kyte, it cascades with the kyte, and a lapsed one
 * is re-issued in place so the shared URL survives.
 */
export async function runCleanupJob(
  db: PrismaClient = getDb(),
  now: Date = new Date(),
): Promise<CleanupResult> {
  const expiredSessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const expiredVerifications = await db.verification.deleteMany({ where: { expiresAt: { lt: now } } });

  const expiredInvites = await db.orgInvite.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  const prunedInvites = await db.orgInvite.deleteMany({
    where: {
      status: { in: ["ACCEPTED", "DECLINED", "REVOKED", "EXPIRED"] },
      createdAt: { lt: new Date(now.getTime() - RESPONDED_INVITE_GRACE_MS) },
    },
  });

  // Defensive orphan prune: Asset rows whose Kyte no longer exists (Cascade
  // normally handles this; catches any that leaked).
  const liveKytes = await db.kyte.findMany({ select: { id: true } });
  const liveKyteIds = new Set(liveKytes.map((k) => k.id));
  const assetKytes = await db.asset.findMany({ select: { kyteId: true }, distinct: ["kyteId"] });
  const orphanKyteIds = assetKytes.map((a) => a.kyteId).filter((id) => !liveKyteIds.has(id));
  const orphanedAssets = orphanKyteIds.length
    ? await db.asset.deleteMany({ where: { kyteId: { in: orphanKyteIds } } })
    : { count: 0 };

  const result: CleanupResult = {
    expiredSessions: expiredSessions.count,
    expiredVerifications: expiredVerifications.count,
    expiredInvites: expiredInvites.count,
    prunedInvites: prunedInvites.count,
    orphanedAssets: orphanedAssets.count,
  };
  log.info(result, "cleanup sweep done — expired rows deleted");
  return result;
}

export function createCleanupWorker(): Worker {
  const worker = new Worker(
    CLEANUP_QUEUE_NAME,
    (_job: Job) => runCleanupJob(),
    { connection: getRedis(), concurrency: 1 },
  );
  return worker;
}

export async function scheduleCleanup(): Promise<void> {
  await getQueue(CLEANUP_QUEUE_NAME).add(
    "nightly",
    {},
    { repeat: { pattern: "30 3 * * *" }, jobId: "cleanup-nightly" },
  );
}
