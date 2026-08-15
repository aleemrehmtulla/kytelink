import type { Logger } from "pino";
import { computeContentHash } from "./content-hash";
import {
  collectAdvisorySignals,
  findBrandClaim,
  findDeterministicHits,
} from "./deterministic-checks";
import { getSuspendMinConfidence } from "./moderation-env";
import { OpenAiModerationFailure } from "./provider-openai";
import type {
  ModerationKyteSnapshot,
  ModerationProvider,
  ModerationReviewContext,
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

interface ReviewOptions {
  /** Overrides MODERATION_SUSPEND_MIN_CONFIDENCE for this call. */
  minSuspendConfidence?: number;
}

type ReviewOutcome =
  | { kind: "no_kyte" }
  | { kind: "stale_event"; currentPublishSeq: number }
  | { kind: "cache_hit"; contentHash: string }
  | { kind: "reviewed"; result: ModerationVerdictResult; statusApplied: boolean };

const REASON_LOG_MAX_CHARS = 160;

function signalKeysOf(signals: ModerationSignals): string[] {
  const keys = Object.keys(signals).filter((key) => key !== "publishSeq" && key !== "advisory");
  const advisory = signals.advisory?.map((entry) => entry.key) ?? [];
  return [...keys, ...advisory];
}

function shortReason(reason: string): string {
  const flattened = reason.replace(/\s+/g, " ").trim();
  return flattened.length > REASON_LOG_MAX_CHARS
    ? `${flattened.slice(0, REASON_LOG_MAX_CHARS - 1)}…`
    : flattened;
}

async function runProvider(
  provider: ModerationProvider,
  snapshot: ModerationKyteSnapshot,
  context: ModerationReviewContext,
  publishSeq: number,
  log: Logger,
): Promise<ModerationVerdictResult> {
  try {
    const outcome = await provider.review(snapshot, context);
    const signals: ModerationSignals = { publishSeq, ...outcome.signals };
    return {
      verdict: outcome.verdict,
      categories: outcome.categories,
      confidence: outcome.confidence,
      reason: outcome.reason,
      provider: provider.name,
      signals,
      model: outcome.model,
      escalation: outcome.escalation,
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

/**
 * Every suspension passes through here — there is no pattern match that skips
 * it. An unsure model must not take a business offline, so the verdict flips to
 * APPROVE while the categories, signals, and reason stay on the record, and the
 * admin queue can still be filtered for what the model thought it saw.
 */
function applyConfidenceGate(
  result: ModerationVerdictResult,
  minConfidence: number,
): { result: ModerationVerdictResult; gated: boolean } {
  if (result.verdict !== "SUSPEND") return { result, gated: false };
  if (result.confidence >= minConfidence) return { result, gated: false };
  return {
    gated: true,
    result: {
      ...result,
      verdict: "APPROVE",
      categories: [...result.categories, "low_confidence"],
      reason: `${result.reason} (Confidence ${result.confidence.toFixed(2)} is below the ${minConfidence.toFixed(2)} suspend threshold, so this was approved; manual reports remain the backstop.)`,
    },
  };
}

export async function reviewKyte(
  store: ModerationStore,
  provider: ModerationProvider,
  trigger: ReviewTrigger,
  log: Logger,
  options: ReviewOptions = {},
): Promise<ReviewOutcome> {
  const snapshot = await store.loadKyteForReview(trigger.kyteId);
  if (!snapshot) {
    log.info({ kyteId: trigger.kyteId, outcome: "no_kyte" }, "moderation review skipped — no published kyte");
    return { kind: "no_kyte" };
  }

  if (!trigger.forceReReview && snapshot.publishSeq !== trigger.publishSeq) {
    log.info(
      {
        kyteId: trigger.kyteId,
        username: snapshot.username,
        outcome: "stale_event",
        eventSeq: trigger.publishSeq,
        currentSeq: snapshot.publishSeq,
      },
      "moderation review skipped — a newer publish superseded this event",
    );
    return { kind: "stale_event", currentPublishSeq: snapshot.publishSeq };
  }

  const contentHash = computeContentHash(snapshot);
  const brandClaim = findBrandClaim(snapshot);
  const deterministicHits = findDeterministicHits(snapshot);
  const flagged = brandClaim !== null || deterministicHits.length > 0;

  // A flagged page is always put in front of the model, even on content it has
  // seen before: those verdicts are the ones that take a page down or clear a
  // real company, and they are not answers to serve from cache.
  if (!trigger.forceReReview && !flagged) {
    const cached = await store.findReviewByHash(trigger.kyteId, contentHash);
    if (cached) {
      await store.saveContentHash(trigger.kyteId, contentHash);
      log.info(
        {
          kyteId: trigger.kyteId,
          username: snapshot.username,
          outcome: "cache_hit",
          verdict: cached.verdict,
          contentHash,
        },
        "moderation review skipped — this exact content was already reviewed",
      );
      return { kind: "cache_hit", contentHash };
    }
  }

  const advisory = collectAdvisorySignals(snapshot);
  const minSuspendConfidence = options.minSuspendConfidence ?? getSuspendMinConfidence();
  const { result, gated } = applyConfidenceGate(
    await runProvider(
      provider,
      snapshot,
      { advisory, brandClaim, deterministicHits, minSuspendConfidence },
      trigger.publishSeq,
      log,
    ),
    minSuspendConfidence,
  );

  if (!result.signals.advisory && advisory.length > 0) {
    result.signals.advisory = advisory;
  }
  if (brandClaim && !result.signals.sus_name) {
    result.signals.sus_name = {
      field: brandClaim.field,
      value: brandClaim.value,
      keyword: brandClaim.claim,
    };
  }
  // The pattern evidence stays on the review even when the model clears the
  // page, so the admin queue can still be filtered by what tripped.
  const linkHits = deterministicHits.filter((hit) => hit.kind === "link");
  if (linkHits.length > 0 && !result.signals.sus_link) {
    result.signals.sus_link = linkHits.map((hit) => ({ url: hit.url, pattern: hit.pattern }));
  }
  const redirectHit = deterministicHits.find((hit) => hit.kind === "redirect");
  if (redirectHit && !result.signals.sus_redirect) {
    result.signals.sus_redirect = { url: redirectHit.url, pattern: redirectHit.pattern };
  }

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

  const wasSuspended = snapshot.moderationStatus === "SUSPENDED";
  // Only a human-initiated re-review (the admin sweep, or one kyte re-reviewed
  // from the admin app) may lift a suspension. A publish-triggered scan must
  // not, or a suspended phisher could republish sanitised content and restore
  // their own page — the status row included, not just the side effects.
  const mayLiftSuspension = trigger.forceReReview === true;
  const unsuspendSkipped = result.verdict === "APPROVE" && wasSuspended && !mayLiftSuspension;

  const targetStatus = result.verdict === "SUSPEND" ? "SUSPENDED" : "APPROVED";
  const { applied } = unsuspendSkipped
    ? { applied: false }
    : await store.setModerationStatus(trigger.kyteId, targetStatus, {
        ifPublishSeqAtMost: trigger.publishSeq,
      });

  if (applied && result.verdict === "SUSPEND") {
    await store.quarantineAssets(trigger.kyteId);
    await store.requestRevalidate(trigger.kyteId, snapshot.username);
    await store.notifySuspendedOwners(trigger.kyteId, snapshot.username, result.reason);
  }
  if (applied && result.verdict === "APPROVE" && wasSuspended) {
    await store.unquarantineAssets(trigger.kyteId);
    await store.requestRevalidate(trigger.kyteId, snapshot.username);
  }

  log.info(
    {
      kyteId: trigger.kyteId,
      username: snapshot.username,
      outcome: "reviewed",
      verdict: result.verdict,
      provider: result.provider,
      model: result.model,
      escalated: result.escalation,
      brandClaim: brandClaim?.brand,
      deterministicHit:
        deterministicHits.length > 0
          ? [...new Set(deterministicHits.map((hit) => hit.rule))].join(",")
          : undefined,
      confidence: Number(result.confidence.toFixed(2)),
      categories: result.categories.join(",") || "none",
      signals: signalKeysOf(result.signals).join(",") || "none",
      applied,
      unsuspended: applied && result.verdict === "APPROVE" && wasSuspended,
      unsuspendSkipped: unsuspendSkipped ? "organic-review" : undefined,
      gated: gated ? `below ${minSuspendConfidence.toFixed(2)}` : undefined,
      why: shortReason(result.reason),
    },
    "moderation review done",
  );

  return { kind: "reviewed", result, statusApplied: applied };
}
