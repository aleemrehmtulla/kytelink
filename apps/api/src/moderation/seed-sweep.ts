import type { Logger } from "pino";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

export interface SweepTally {
  total: number;
  processed: number;
  reviewed: number;
  suspended: number;
  approved: number;
  skipped: number;
  failed: number;
}

export interface SweepStatusChange {
  kyteId: string;
  username: string | null;
  suspended: boolean;
}

export interface SweepResult extends SweepTally {
  changed: SweepStatusChange[];
}

export interface SweepOptions {
  /** Recorded on every ModerationReview row this sweep writes. */
  reviewedBy?: string;
  progressEvery?: number;
  onProgress?: (tally: SweepTally) => Promise<void>;
}

const DEFAULT_PROGRESS_EVERY = 10;

export async function runSeedSweep(
  store: ModerationStore,
  provider: ModerationProvider,
  log: Logger,
  options: SweepOptions = {},
): Promise<SweepResult> {
  const kytes = await store.listAllPublishedForSweep();
  const reviewedBy = options.reviewedBy ?? "seed-sweep";
  const progressEvery = options.progressEvery ?? DEFAULT_PROGRESS_EVERY;
  const tally: SweepTally = {
    total: kytes.length,
    processed: 0,
    reviewed: 0,
    suspended: 0,
    approved: 0,
    skipped: 0,
    failed: 0,
  };
  const changed: SweepStatusChange[] = [];

  // Emitted before the first review so a watching UI gets the real total
  // immediately rather than after the first batch.
  if (options.onProgress) await options.onProgress({ ...tally });

  for (const snapshot of kytes) {
    try {
      const outcome = await reviewKyte(
        store,
        provider,
        {
          kyteId: snapshot.kyteId,
          publishSeq: snapshot.publishSeq,
          reviewedBy,
          forceReReview: true,
        },
        log,
      );

      if (outcome.kind !== "reviewed") {
        tally.skipped += 1;
      } else {
        tally.reviewed += 1;
        const suspended = outcome.result.verdict === "SUSPEND";
        if (suspended) tally.suspended += 1;
        else tally.approved += 1;
        const target = suspended ? "SUSPENDED" : "APPROVED";
        if (outcome.statusApplied && snapshot.moderationStatus !== target) {
          changed.push({ kyteId: snapshot.kyteId, username: snapshot.username, suspended });
        }
      }
    } catch (error) {
      // The provider already fails open per kyte, so reaching here means the
      // store threw. One bad row must not abandon the remaining thousands.
      tally.failed += 1;
      log.error({ err: error, kyteId: snapshot.kyteId }, "sweep could not review this kyte — moving on");
    }

    tally.processed += 1;
    if (options.onProgress && tally.processed % progressEvery === 0) {
      await options.onProgress({ ...tally });
    }
  }

  log.info(tally, "moderation seed sweep done");
  return { ...tally, changed };
}
