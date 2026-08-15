import type {
  ModerationKyteSnapshot,
  ModerationProvider,
  ModerationReviewContext,
  ProviderReviewOutcome,
} from "./types";

export function createNoneProvider(): ModerationProvider {
  return {
    name: "none",
    review(
      _snapshot: ModerationKyteSnapshot,
      _context?: ModerationReviewContext,
    ): Promise<ProviderReviewOutcome> {
      return Promise.resolve({
        verdict: "APPROVE",
        categories: [],
        confidence: 1,
        reason: "MODERATION_PROVIDER=none — moderation disabled, auto-approved.",
        signals: {},
      });
    },
  };
}
