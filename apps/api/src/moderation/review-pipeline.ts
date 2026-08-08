import type { Logger } from "pino";
import { computeContentHash } from "./content-hash";
import { runDeterministicChecks } from "./deterministic-checks";
import { OpenAiModerationFailure } from "./provider-openai";
import type {
  ModerationKyteSnapshot,
  ModerationProvider,
  ModerationSignals,
  ModerationStore,
  ModerationVerdictResult,
} from "./types";

interface ReviewTrigger {
  kyteId: string;
  publishSeq: number;
  reviewedBy: string | null;
  forceReReview?: boolean;
}

type ReviewOutcome =
  | { kind: "no_kyte" }
  | { kind: "stale_event"; currentPublishSeq: number }
  | { kind: "cache_hit"; contentHash: string }
  | { kind: "reviewed"; result: ModerationVerdictResult; statusApplied: boolean };

async function runProvider(
  provider: ModerationProvider,
  snapshot: ModerationKyteSnapshot,
  publishSeq: number,
  log: Logger,
): Promise<ModerationVerdictResult> {
  try {
    const outcome = await provider.review(snapshot);
    const signals: ModerationSignals = { publishSeq, ...outcome.signals };
    return {
      verdict: outcome.verdict,
      categories: outcome.categories,
      confidence: outcome.confidence,
      reason: outcome.reason,
      provider: provider.name,
      signals,
    };
  } catch (error) {
    log.error({ err: error, kyteId: snapshot.kyteId }, "provider failed — leaving the kyte published (fail open) and moving on");
    return {
      verdict: "APPROVE",
      categories: ["review_failed"],
      confidence: 0,
      reason:
        error instanceof OpenAiModerationFailure
          ? "Provider errored after retries; failed open to APPROVE."
          : "Provider threw an unexpected error; failed open to APPROVE.",
      provider: provider.name,
      signals: { publishSeq },
    };
  }
}

export async function reviewKyte(
  store: ModerationStore,
  provider: ModerationProvider,
  trigger: ReviewTrigger,
  log: Logger,
): Promise<ReviewOutcome> {
  const snapshot = await store.loadKyteForReview(trigger.kyteId);
  if (!snapshot) {
    return { kind: "no_kyte" };
  }

  if (!trigger.forceReReview && snapshot.publishSeq !== trigger.publishSeq) {
    log.info(
      { kyteId: trigger.kyteId, eventSeq: trigger.publishSeq, currentSeq: snapshot.publishSeq },
      "moderation event superseded by a newer publish, skipping",
    );
    return { kind: "stale_event", currentPublishSeq: snapshot.publishSeq };
  }

  const contentHash = computeContentHash(snapshot);

  if (!trigger.forceReReview) {
    const cached = await store.findReviewByHash(trigger.kyteId, contentHash);
    if (cached) {
      await store.saveContentHash(trigger.kyteId, contentHash);
      log.debug({ kyteId: trigger.kyteId, contentHash }, "skipped review — this exact content was reviewed before");
      return { kind: "cache_hit", contentHash };
    }
  }

  const deterministicHit = runDeterministicChecks(snapshot, trigger.publishSeq);
  const result = deterministicHit ?? (await runProvider(provider, snapshot, trigger.publishSeq, log));

  await store.saveContentHash(trigger.kyteId, contentHash);
  await store.writeReview({
    kyteId: trigger.kyteId,
    contentHash,
    verdict: result.verdict,
    categories: result.categories,
    reason: result.reason,
    provider: result.provider,
    confidence: result.confidence,
    signals: result.signals,
    reviewedBy: trigger.reviewedBy,
  });

  if (result.categories.includes("review_failed")) {
    await store.adminAlert(
      "moderation_fail_open",
      `Moderation provider failed for kyte ${trigger.kyteId}; auto-approved (fail-open).`,
      { kyteId: trigger.kyteId, contentHash },
    );
  }

  const targetStatus = result.verdict === "SUSPEND" ? "SUSPENDED" : "APPROVED";
  const { applied } = await store.setModerationStatus(trigger.kyteId, targetStatus, {
    ifPublishSeqAtMost: trigger.publishSeq,
  });

  if (applied && result.verdict === "SUSPEND") {
    await store.quarantineAssets(trigger.kyteId);
    await store.requestRevalidate(trigger.kyteId, snapshot.username);
    await store.notifySuspendedOwners(trigger.kyteId, snapshot.username, result.reason);
  }

  return { kind: "reviewed", result, statusApplied: applied };
}
