import type { Logger } from "pino";
import type { ModerationVerdict } from "@kytelink/schemas";
import { runWithConcurrency } from "./concurrency-queue";
import { getSweepConcurrency } from "./moderation-env";
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

export type SweepActivityVerdict = ModerationVerdict | "SKIPPED" | "FAILED";

export interface SweepActivity {
  kyteId: string;
  username: string | null;
  verdict: SweepActivityVerdict;
  /** The kyte's moderation status actually moved — a fresh suspension or a restore. */
  changed: boolean;
  reason: string;
  at: string;
}

export interface SweepSnapshot extends SweepTally {
  recent: SweepActivity[];
}

export interface SweepStatusChange {
  kyteId: string;
  username: string | null;
  suspended: boolean;
}

export interface SweepResult extends SweepSnapshot {
  changed: SweepStatusChange[];
}

export interface SweepOptions {
  /** Recorded on every ModerationReview row this sweep writes. */
  reviewedBy?: string;
  concurrency?: number;
  progressEvery?: number;
  progressThrottleMs?: number;
  onProgress?: (snapshot: SweepSnapshot) => Promise<void>;
}

const DEFAULT_PROGRESS_EVERY = 5;
// Floor between two Redis writes, and the age at which a write happens anyway.
// Together they keep the blob moving at ~1Hz — fast enough that the bar never
// looks stuck — without turning a 6k sweep into 6k Redis round-trips.
const PROGRESS_THROTTLE_MS = 250;
const PROGRESS_HEARTBEAT_MS = 1000;
const RECENT_ACTIVITY_LIMIT = 15;
const REASON_MAX_CHARS = 140;

function oneLine(reason: string): string {
  const flattened = reason.replace(/\s+/g, " ").trim();
  return flattened.length > REASON_MAX_CHARS
    ? `${flattened.slice(0, REASON_MAX_CHARS - 1)}…`
    : flattened;
}

export async function runSeedSweep(
  store: ModerationStore,
  provider: ModerationProvider,
  log: Logger,
  options: SweepOptions = {},
): Promise<SweepResult> {
  const kytes = await store.listAllPublishedForSweep();
  const reviewedBy = options.reviewedBy ?? "seed-sweep";
  const progressEvery = Math.max(1, options.progressEvery ?? DEFAULT_PROGRESS_EVERY);
  const throttleMs = options.progressThrottleMs ?? PROGRESS_THROTTLE_MS;
  const concurrency = options.concurrency ?? getSweepConcurrency();
  const tally: SweepTally = {
    total: kytes.length,
    processed: 0,
    reviewed: 0,
    suspended: 0,
    approved: 0,
    skipped: 0,
    failed: 0,
  };
  // Slot per input index rather than push order, so `changed` stays in the
  // store's ordering no matter which worker finishes first.
  const changedBySlot = new Array<SweepStatusChange | undefined>(kytes.length);
  const recent: SweepActivity[] = [];

  let lastEmitAt = 0;
  let inFlightEmit: Promise<void> | null = null;

  async function emit(): Promise<void> {
    if (!options.onProgress) return;
    lastEmitAt = Date.now();
    const snapshot: SweepSnapshot = { ...tally, recent: [...recent] };
    const write = options.onProgress(snapshot).catch((error: unknown) => {
      // Redis being briefly unavailable costs a progress frame, never the run.
      log.warn({ err: error }, "sweep could not publish progress — continuing");
    });
    inFlightEmit = write;
    await write;
    if (inFlightEmit === write) inFlightEmit = null;
  }

  function record(activity: SweepActivity): void {
    recent.unshift(activity);
    if (recent.length > RECENT_ACTIVITY_LIMIT) recent.length = RECENT_ACTIVITY_LIMIT;
  }

  // Emitted before the first review so a watching UI gets the real total
  // immediately rather than after the first batch.
  await emit();

  await runWithConcurrency(kytes, concurrency, async (snapshot, index) => {
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
        record({
          kyteId: snapshot.kyteId,
          username: snapshot.username,
          verdict: "SKIPPED",
          changed: false,
          reason: outcome.kind === "no_kyte" ? "Kyte no longer exists" : "Superseded by a newer publish",
          at: new Date().toISOString(),
        });
      } else {
        tally.reviewed += 1;
        const suspended = outcome.result.verdict === "SUSPEND";
        if (suspended) tally.suspended += 1;
        else tally.approved += 1;
        const target = suspended ? "SUSPENDED" : "APPROVED";
        const moved = outcome.statusApplied && snapshot.moderationStatus !== target;
        if (moved) {
          changedBySlot[index] = { kyteId: snapshot.kyteId, username: snapshot.username, suspended };
        }
        record({
          kyteId: snapshot.kyteId,
          username: snapshot.username,
          verdict: outcome.result.verdict,
          changed: moved,
          reason: oneLine(outcome.result.reason),
          at: new Date().toISOString(),
        });
      }
    } catch (error) {
      // The provider already fails open per kyte, so reaching here means the
      // store threw. One bad row must not abandon the remaining thousands.
      tally.failed += 1;
      log.error({ err: error, kyteId: snapshot.kyteId }, "sweep could not review this kyte — moving on");
      record({
        kyteId: snapshot.kyteId,
        username: snapshot.username,
        verdict: "FAILED",
        changed: false,
        reason: error instanceof Error ? oneLine(error.message) : "Review threw",
        at: new Date().toISOString(),
      });
    }

    tally.processed += 1;

    const sinceLastEmit = Date.now() - lastEmitAt;
    const due = tally.processed % progressEvery === 0;
    const stale = sinceLastEmit >= PROGRESS_HEARTBEAT_MS;
    if (inFlightEmit === null && (stale || (due && sinceLastEmit >= throttleMs))) {
      await emit();
    }
  });

  if (inFlightEmit) await inFlightEmit;

  const changed = changedBySlot.filter((entry): entry is SweepStatusChange => entry !== undefined);
  log.info({ ...tally, concurrency }, "moderation seed sweep done");
  return { ...tally, recent: [...recent], changed };
}
