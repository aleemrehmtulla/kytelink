import type { Logger } from "pino";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationStore } from "./types";

export async function approveKyte(store: ModerationStore, kyteId: string): Promise<void> {
  const snapshot = await store.loadKyteForReview(kyteId);
  const wasSuspended = snapshot?.moderationStatus === "SUSPENDED";
  await store.forceSetModerationStatus(kyteId, "APPROVED");
  await store.unquarantineAssets(kyteId);
  await store.requestRevalidate(kyteId, snapshot?.username ?? null);
  if (wasSuspended) {
    await store.notifyRestoredOwners(kyteId, snapshot?.username ?? null);
  }
}

export async function suspendKyte(store: ModerationStore, kyteId: string): Promise<void> {
  const snapshot = await store.loadKyteForReview(kyteId);
  await store.forceSetModerationStatus(kyteId, "SUSPENDED");
  await store.quarantineAssets(kyteId);
  await store.requestRevalidate(kyteId, snapshot?.username ?? null);
}

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
