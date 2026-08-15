import type { ModerationStatus, ModerationVerdict } from "@kytelink/schemas";
import type {
  ModerationKyteSnapshot,
  ModerationReviewInput,
  ModerationStore,
  SetModerationStatusResult,
} from "./types";

export interface FakeModerationStore extends ModerationStore {
  kytes: Map<string, ModerationKyteSnapshot>;
  reviews: ModerationReviewInput[];
  alerts: Array<{ kind: string; message: string; meta?: Record<string, unknown> }>;
  quarantinedKyteIds: Set<string>;
  revalidateCalls: Array<{ kyteId: string; username: string | null }>;
  suspendedEmailCalls: Array<{ kyteId: string; username: string | null; reason: string }>;
  restoredEmailCalls: Array<{ kyteId: string; username: string | null }>;
}

export function createFakeModerationStore(
  seed: ModerationKyteSnapshot[] = [],
): FakeModerationStore {
  const kytes = new Map(seed.map((snapshot) => [snapshot.kyteId, snapshot]));
  const reviews: ModerationReviewInput[] = [];
  const alerts: Array<{ kind: string; message: string; meta?: Record<string, unknown> }> = [];
  const quarantinedKyteIds = new Set<string>();
  const revalidateCalls: Array<{ kyteId: string; username: string | null }> = [];
  const suspendedEmailCalls: Array<{ kyteId: string; username: string | null; reason: string }> = [];
  const restoredEmailCalls: Array<{ kyteId: string; username: string | null }> = [];

  return {
    kytes,
    reviews,
    alerts,
    quarantinedKyteIds,
    revalidateCalls,
    suspendedEmailCalls,
    restoredEmailCalls,

    loadKyteForReview(kyteId: string): Promise<ModerationKyteSnapshot | null> {
      const found = kytes.get(kyteId);
      return Promise.resolve(found ? { ...found } : null);
    },

    saveContentHash(kyteId: string, contentHash: string): Promise<void> {
      const found = kytes.get(kyteId);
      if (found) found.contentHash = contentHash;
      return Promise.resolve();
    },

    findReviewByHash(
      kyteId: string,
      contentHash: string,
    ): Promise<{ verdict: ModerationVerdict } | null> {
      const match = [...reviews]
        .reverse()
        .find((review) => review.kyteId === kyteId && review.contentHash === contentHash);
      return Promise.resolve(match ? { verdict: match.verdict } : null);
    },

    writeReview(review: ModerationReviewInput): Promise<void> {
      reviews.push(review);
      return Promise.resolve();
    },

    setModerationStatus(
      kyteId: string,
      status: ModerationStatus,
      opts: { ifPublishSeqAtMost: number },
    ): Promise<SetModerationStatusResult> {
      const found = kytes.get(kyteId);
      if (!found) return Promise.resolve({ applied: false, currentPublishSeq: -1 });
      if (found.publishSeq !== opts.ifPublishSeqAtMost) {
        return Promise.resolve({ applied: false, currentPublishSeq: found.publishSeq });
      }
      found.moderationStatus = status;
      return Promise.resolve({ applied: true, currentPublishSeq: found.publishSeq });
    },

    forceSetModerationStatus(kyteId: string, status: ModerationStatus): Promise<void> {
      const found = kytes.get(kyteId);
      if (found) found.moderationStatus = status;
      return Promise.resolve();
    },

    quarantineAssets(kyteId: string): Promise<void> {
      quarantinedKyteIds.add(kyteId);
      return Promise.resolve();
    },

    unquarantineAssets(kyteId: string): Promise<void> {
      quarantinedKyteIds.delete(kyteId);
      return Promise.resolve();
    },

    requestRevalidate(kyteId: string, username: string | null): Promise<void> {
      revalidateCalls.push({ kyteId, username });
      return Promise.resolve();
    },

    notifySuspendedOwners(kyteId: string, username: string | null, reason: string): Promise<void> {
      suspendedEmailCalls.push({ kyteId, username, reason });
      return Promise.resolve();
    },

    notifyRestoredOwners(kyteId: string, username: string | null): Promise<void> {
      restoredEmailCalls.push({ kyteId, username });
      return Promise.resolve();
    },

    adminAlert(kind: string, message: string, meta?: Record<string, unknown>): Promise<void> {
      alerts.push({ kind, message, meta });
      return Promise.resolve();
    },

    listAllPublishedForSweep(): Promise<ModerationKyteSnapshot[]> {
      return Promise.resolve([...kytes.values()].map((snapshot) => ({ ...snapshot })));
    },
  };
}
