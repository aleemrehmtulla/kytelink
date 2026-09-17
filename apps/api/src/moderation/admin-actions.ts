import type { Logger } from "pino";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

export async function forceReReviewKyte(
  store: ModerationStore,
  provider: ModerationProvider,
  log: Logger,
  kyteId: string,
  reviewedBy: string,
): Promise<ReturnType<typeof reviewKyte>> {
  const snapshot = await store.loadKyteForReview(kyteId);
  if (!snapshot) {
    return { kind: "no_kyte" };
  }
  return reviewKyte(
    store,
    provider,
    { kyteId, publishSeq: snapshot.publishSeq, reviewedBy, forceReReview: true },
    log,
  );
}
