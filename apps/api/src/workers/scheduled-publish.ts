import { getDb } from "@kytelink/db";
import { isKyteEffectivelySuspended, profileContentSchema } from "@kytelink/schemas";
import { afterPublish } from "../publish-hooks";
import { taggedLogger } from "../logger";
import { getRealStore } from "../store/instance";
import { adminAlert } from "./admin-alert";

const log = taggedLogger("publish");

export interface SweepResult {
  published: string[];
  skipped: string[];
  failed: string[];
}

const BATCH = 50;
// Bounds the within-tick drain so a burst of >BATCH due schedules is caught up
// inside a single 30s tick (M5) without an unbounded loop.
const MAX_TICKS = 20;

/**
 * Drains every due schedule through the SAME publish pipeline as a manual
 * publish (`store.publishKyte` + `afterPublish`), so a scheduled publish fires
 * the identical side-effects — og-image regen, beacon-membership refresh,
 * moderation scan, and the single profile-cache buster owned by the store (D1,
 * D3). Row-locked and idempotent: the schedule is claimed with a conditional
 * `PENDING -> PUBLISHED` update, so two workers never fire the same schedule.
 */
export async function sweepScheduledPublishes(now: Date = new Date()): Promise<SweepResult> {
  const db = getDb();
  const store = getRealStore();
  const result: SweepResult = { published: [], skipped: [], failed: [] };
  const skippedIds = new Set<string>();

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    const due = await db.scheduledPublish.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: now },
        ...(skippedIds.size > 0 ? { id: { notIn: [...skippedIds] } } : {}),
      },
      orderBy: { scheduledFor: "asc" },
      take: BATCH,
    });
    if (due.length === 0) break;

    for (const schedule of due) {
      try {
        const kyte = await store.kyteById(schedule.kyteId);
        if (!kyte) {
          await db.scheduledPublish.updateMany({
            where: { id: schedule.id, status: "PENDING" },
            data: { status: "FAILED", firedAt: now, error: "kyte missing" },
          });
          result.failed.push(schedule.id);
          await adminAlert("scheduled_publish_failed", `Scheduled publish ${schedule.id} failed`, {
            scheduleId: schedule.id,
            reason: "kyte missing",
          });
          continue;
        }

        const org = await store.orgById(kyte.orgId);
        if (
          isKyteEffectivelySuspended({
            moderationStatus: kyte.moderationStatus,
            orgSuspendedAt: org?.suspendedAt ?? null,
          })
        ) {
          skippedIds.add(schedule.id);
          result.skipped.push(schedule.id);
          continue;
        }

        // Atomic claim: only the worker that flips PENDING -> PUBLISHED proceeds.
        const claimed = await db.scheduledPublish.updateMany({
          where: { id: schedule.id, status: "PENDING" },
          data: { status: "PUBLISHED", firedAt: now },
        });
        if (claimed.count === 0) {
          result.skipped.push(schedule.id);
          continue;
        }

        try {
          const snapshot = profileContentSchema.parse(schedule.snapshot);
          await store.updateDraft(kyte.id, snapshot);
          const published = await store.publishKyte({
            kyteId: kyte.id,
            actorUserId: schedule.createdById,
          });
          const refreshed = (await store.kyteById(kyte.id)) ?? { ...kyte, draft: snapshot };
          await afterPublish(refreshed, published.publishSeq);
          await db.auditLog.create({
            data: {
              orgId: kyte.orgId,
              kyteId: kyte.id,
              actorId: schedule.createdById,
              action: "schedule.fire",
              summary: "schedule fire",
              meta: { scheduleId: schedule.id, publishSeq: published.publishSeq },
            },
          });
          result.published.push(schedule.id);
        } catch (error) {
          // The claim already flipped it to PUBLISHED; roll it forward to FAILED
          // so it is not silently marked as a successful publish.
          await db.scheduledPublish
            .update({
              where: { id: schedule.id },
              data: { status: "FAILED", firedAt: now, error: String(error) },
            })
            .catch(() => undefined);
          throw error;
        }
      } catch (error) {
        result.failed.push(schedule.id);
        log.error(
          { err: error, scheduleId: schedule.id },
          "a scheduled publish failed — the kyte is still a draft and will be retried",
        );
        await adminAlert("scheduled_publish_failed", `Scheduled publish ${schedule.id} threw`, {
          scheduleId: schedule.id,
        });
      }
    }

    if (due.length < BATCH) break;
  }

  return result;
}
