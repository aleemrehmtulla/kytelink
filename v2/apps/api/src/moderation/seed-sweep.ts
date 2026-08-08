import type { Logger } from "pino";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

interface SeedSweepResult {
  reviewed: number;
  suspended: number;
  approved: number;
  skipped: number;
}

export async function runSeedSweep(
  store: ModerationStore,
  provider: ModerationProvider,
  log: Logger,
): Promise<SeedSweepResult> {
  const kytes = await store.listAllPublishedForSweep();
  const result: SeedSweepResult = { reviewed: 0, suspended: 0, approved: 0, skipped: 0 };

  for (const snapshot of kytes) {
    const outcome = await reviewKyte(
      store,
      provider,
      {
        kyteId: snapshot.kyteId,
        publishSeq: snapshot.publishSeq,
        reviewedBy: "seed-sweep",
        forceReReview: true,
      },
      log,
    );

    if (outcome.kind !== "reviewed") {
      result.skipped += 1;
      continue;
    }
    result.reviewed += 1;
    if (outcome.result.verdict === "SUSPEND") {
      result.suspended += 1;
    } else {
      result.approved += 1;
    }
  }

  log.info(result, "moderation seed sweep done");
  return result;
}
