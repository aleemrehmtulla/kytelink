import type { ModerationKyteSnapshot, ModerationProvider, ProviderReviewOutcome } from "./types";

export function createNoneProvider(): ModerationProvider {
  return {
    name: "none",
    review(_snapshot: ModerationKyteSnapshot): Promise<ProviderReviewOutcome> {
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
