import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { createOpenAiProvider, type OpenAiChatClient } from "./provider-openai";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider, ModerationReviewContext, ProviderReviewOutcome } from "./types";

const log = pino({ level: "silent" });

function jsonMessage(payload: unknown): { choices: Array<{ message: { content: string } }> } {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

function suspendingProvider(confidence: number): ModerationProvider {
  const outcome: ProviderReviewOutcome = {
    verdict: "SUSPEND",
    categories: ["brand_impersonation"],
    confidence,
    reason: "Looks like a telecom support desk.",
    signals: { sus_link: [{ url: "https://example.com", pattern: "ai_flagged" }] },
    model: "gpt-5",
    escalation: "brand_claim",
  };
  return { name: "openai", review: vi.fn().mockResolvedValue(outcome) };
}

describe("reviewKyte — contentHash caching", () => {
  it("skips deterministic + provider work on an unchanged hash", async () => {
    const provider: ModerationProvider = {
      name: "none",
      review: vi.fn().mockResolvedValue({
        verdict: "APPROVE",
        categories: [],
        confidence: 1,
        reason: "ok",
        signals: {},
      }),
    };
    const snapshot = buildSnapshot({ publishSeq: 1 });
    const store = createFakeModerationStore([snapshot]);

    const first = await reviewKyte(store, provider, { kyteId: snapshot.kyteId, publishSeq: 1, reviewedBy: null }, log);
    expect(first.kind).toBe("reviewed");
    expect(provider.review).toHaveBeenCalledTimes(1);
    expect(store.reviews).toHaveLength(1);

    store.kytes.get(snapshot.kyteId)!.publishSeq = 2;
    const second = await reviewKyte(store, provider, { kyteId: snapshot.kyteId, publishSeq: 2, reviewedBy: null }, log);

    expect(second.kind).toBe("cache_hit");
    expect(provider.review).toHaveBeenCalledTimes(1);
    expect(store.reviews).toHaveLength(1);
  });
});

describe("reviewKyte — deterministic hits are evidence, not verdicts", () => {
  it("suspends a brand-glued capture domain only once the model confirms it", async () => {
    const snapshot = buildSnapshot({
      displayName: "Bell Support Team",
      description: "Verify your account now",
      links: [{ title: "Verify", url: "https://bell-verify.example/login" }],
    });
    const store = createFakeModerationStore([snapshot]);
    const provider = suspendingProvider(0.96);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(outcome.result.provider).toBe("openai");
    expect(provider.review).toHaveBeenCalled();
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
    expect(store.revalidateCalls).toHaveLength(1);
    expect(store.suspendedEmailCalls).toHaveLength(1);

    const review = store.reviews[0]!;
    expect(review.signals.sus_name?.keyword).toBe("bell support team");
  });

  it("leaves the page up when the model does not confirm the hit", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot({
      links: [{ title: "Login", url: "https://xn--pypal-4ve.com/login" }],
    });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.size).toBe(0);

    const hits = reviewSpy.mock.calls[0]?.[1]?.deterministicHits ?? [];
    expect(hits[0]).toMatchObject({ rule: "brand_lookalike", pattern: "homoglyph_of:paypal" });
    // Evidence is still filed against the review even though it was approved.
    expect(store.reviews[0]?.signals.sus_link?.[0]?.pattern).toBe("homoglyph_of:paypal");
  });

  it("hands an IP-logger link to the provider as evidence", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot({ redirectUrl: "https://grabify.link/xyz" });
    const store = createFakeModerationStore([snapshot]);

    await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(reviewSpy.mock.calls[0]?.[1]?.deterministicHits?.[0]).toMatchObject({
      rule: "ip_logger",
      kind: "redirect",
    });
    expect(store.reviews[0]?.signals.sus_redirect?.pattern).toBe("blocklist:grabify.link");
  });

  it("re-reviews a deterministic hit even when the content hash is unchanged", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot({ links: [{ title: "Track", url: "https://grabify.link/x" }] });
    const store = createFakeModerationStore([snapshot]);
    const trigger = { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null };

    await reviewKyte(store, provider, trigger, log);
    const second = await reviewKyte(store, provider, trigger, log);

    expect(second.kind).toBe("reviewed");
    expect(reviewSpy).toHaveBeenCalledTimes(2);
  });

  it("hands a clinic to the provider instead of suspending it, with its advisory signals", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot({
      displayName: "Bell Dental Clinic",
      description: "Customer support: belldental@gmail.com",
      links: [{ title: "Book", url: "https://belldental.ca/book" }],
      ownerEmailDomain: "gmail.com",
    });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(reviewSpy.mock.calls[0]?.[1]?.advisory?.map((signal) => signal.key)).toContain(
      "free_mail_owner",
    );
    expect(reviewSpy.mock.calls[0]?.[1]?.brandClaim).toBeNull();
    expect(store.reviews[0]?.signals.advisory?.map((signal) => signal.key)).toContain("brand_mention");
  });
});

describe("reviewKyte — a brand claim is verified by the AI, never by a pattern", () => {
  const rogersSupport = {
    username: "rogerssupport",
    displayName: "Rogers Support",
    links: [{ title: "Help", url: "https://example.com" }],
  };

  it("routes 'Rogers Support' to the provider with the brand's official domains", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot(rogersSupport);
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.provider).toBe("none");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");

    const claim = reviewSpy.mock.calls[0]?.[1]?.brandClaim;
    expect(claim?.brand).toBe("Rogers");
    expect(claim?.officialDomains).toEqual(["rogers.com"]);
    expect(claim?.offBrandDestinations).toEqual([
      { url: "https://example.com", pattern: "off_brand_destination" },
    ]);
  });

  it("suspends 'Rogers Support' only on the AI's own verdict", async () => {
    const snapshot = buildSnapshot(rogersSupport);
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      suspendingProvider(0.94),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(outcome.result.provider).toBe("openai");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.reviews[0]?.signals.sus_name?.keyword).toBe("rogers support");
  });

  it("approves a brand support page that links only to the brand's own domains", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot({
      username: "attsupport",
      displayName: "AT&T Customer Support",
      description: "Account help and billing questions.",
      links: [{ title: "Support", url: "https://www.att.com/support/" }],
    });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(reviewSpy.mock.calls[0]?.[1]?.brandClaim?.offBrandDestinations).toEqual([]);
  });

  it("suspends a page claiming Apple that links to apple-support.com, on the model's confirmation", async () => {
    const provider = suspendingProvider(0.97);
    const snapshot = buildSnapshot({
      displayName: "Apple ID Support",
      links: [{ title: "Verify", url: "https://apple-support.com/verify" }],
    });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(outcome.result.provider).toBe("openai");
    expect(provider.review).toHaveBeenCalled();
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");

    const context = (provider.review as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | ModerationReviewContext
      | undefined;
    expect(context?.deterministicHits?.[0]).toMatchObject({
      rule: "brand_lookalike",
      pattern: "brand_phish_host:apple",
      brand: "Apple",
    });
    expect(context?.brandClaim?.brand).toBe("Apple");
  });

  it("re-reviews a brand claim even when the content hash is unchanged", async () => {
    const provider = createNoneProvider();
    const reviewSpy = vi.spyOn(provider, "review");
    const snapshot = buildSnapshot(rogersSupport);
    const store = createFakeModerationStore([snapshot]);
    const trigger = { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null };

    await reviewKyte(store, provider, trigger, log);
    const second = await reviewKyte(store, provider, trigger, log);

    expect(second.kind).toBe("reviewed");
    expect(reviewSpy).toHaveBeenCalledTimes(2);
    expect(store.reviews).toHaveLength(2);
  });
});

describe("reviewKyte — provider=none", () => {
  it("auto-approves clean content", async () => {
    const provider = createNoneProvider();
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.provider).toBe("none");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.size).toBe(0);
  });
});

describe("reviewKyte — suspend confidence gate", () => {
  it("applies a confident AI suspension", async () => {
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      suspendingProvider(0.93),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
  });

  it("approves an unsure AI suspension but keeps its signals on the record", async () => {
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      suspendingProvider(0.55),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.categories).toContain("low_confidence");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.size).toBe(0);
    expect(store.suspendedEmailCalls).toHaveLength(0);

    const review = store.reviews[0]!;
    expect(review.verdict).toBe("APPROVE");
    expect(review.categories).toContain("brand_impersonation");
    expect(review.signals.sus_link?.[0]?.url).toBe("https://example.com");
  });

  it("gates an under-confident suspend even on a deterministic hit", async () => {
    const snapshot = buildSnapshot({ links: [{ title: "Track", url: "https://grabify.link/xyz" }] });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      suspendingProvider(0.6),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.categories).toContain("low_confidence");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
  });
});

describe("reviewKyte — only a human-initiated re-review lifts a suspension", () => {
  it("flips a SUSPENDED kyte back to APPROVED and lifts its quarantine", async () => {
    const snapshot = buildSnapshot({
      username: "belldental",
      displayName: "Bell Dental Clinic",
      moderationStatus: "SUSPENDED",
    });
    const store = createFakeModerationStore([snapshot]);
    store.quarantinedKyteIds.add(snapshot.kyteId);

    const outcome = await reviewKyte(
      store,
      createNoneProvider(),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: "admin-sweep", forceReReview: true },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.statusApplied).toBe(true);
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(false);
    expect(store.revalidateCalls).toEqual([{ kyteId: snapshot.kyteId, username: "belldental" }]);
    expect(store.suspendedEmailCalls).toHaveLength(0);
  });

  it("also restores when an unsure AI suspension is gated down to APPROVE", async () => {
    const snapshot = buildSnapshot({ moderationStatus: "SUSPENDED" });
    const store = createFakeModerationStore([snapshot]);
    store.quarantinedKyteIds.add(snapshot.kyteId);

    const outcome = await reviewKyte(
      store,
      suspendingProvider(0.4),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: "admin-sweep", forceReReview: true },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.statusApplied).toBe(true);
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(false);
  });

  it("leaves the suspension standing when an organic republish scan approves", async () => {
    const snapshot = buildSnapshot({ username: "phisher", moderationStatus: "SUSPENDED" });
    const store = createFakeModerationStore([snapshot]);
    store.quarantinedKyteIds.add(snapshot.kyteId);

    const outcome = await reviewKyte(
      store,
      createNoneProvider(),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.statusApplied).toBe(false);
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
    expect(store.revalidateCalls).toHaveLength(0);
    expect(store.reviews).toHaveLength(1);
  });

  it("still suspends from an organic scan", async () => {
    const snapshot = buildSnapshot({ links: [{ title: "Track", url: "https://grabify.link/xyz" }] });
    const store = createFakeModerationStore([snapshot]);

    await reviewKyte(
      store,
      suspendingProvider(0.95),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
      { minSuspendConfidence: 0.8 },
    );

    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
  });

  it("leaves an already-approved kyte's assets alone", async () => {
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    await reviewKyte(
      store,
      createNoneProvider(),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(store.revalidateCalls).toHaveLength(0);
  });
});

describe("reviewKyte — per-review logging", () => {
  it("logs one info line carrying the verdict, model, escalation, confidence, and signals", async () => {
    const snapshot = buildSnapshot({ username: "belldental" });
    const store = createFakeModerationStore([snapshot]);
    const lines: Record<string, unknown>[] = [];
    const capturing = pino(
      { level: "info" },
      {
        write(chunk: string) {
          lines.push(JSON.parse(chunk) as Record<string, unknown>);
        },
      },
    );

    await reviewKyte(
      store,
      suspendingProvider(0.95),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      capturing,
    );

    const line = lines.find((entry) => entry.msg === "moderation review done");
    expect(line).toMatchObject({
      kyteId: snapshot.kyteId,
      username: "belldental",
      verdict: "SUSPEND",
      provider: "openai",
      model: "gpt-5",
      escalated: "brand_claim",
      confidence: 0.95,
      categories: "brand_impersonation",
      signals: "sus_link",
      applied: true,
    });
    expect(line?.why).toContain("telecom support desk");
  });

  it("names the organic trigger when a suspension was left standing", async () => {
    const snapshot = buildSnapshot({ moderationStatus: "SUSPENDED" });
    const store = createFakeModerationStore([snapshot]);
    const lines: Record<string, unknown>[] = [];
    const capturing = pino(
      { level: "info" },
      {
        write(chunk: string) {
          lines.push(JSON.parse(chunk) as Record<string, unknown>);
        },
      },
    );

    await reviewKyte(
      store,
      createNoneProvider(),
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      capturing,
    );

    expect(lines.at(-1)).toMatchObject({
      verdict: "APPROVE",
      applied: false,
      unsuspendSkipped: "organic-review",
    });
  });

  it("logs the reason a review was skipped", async () => {
    const store = createFakeModerationStore([buildSnapshot({ publishSeq: 5 })]);
    const lines: Record<string, unknown>[] = [];
    const capturing = pino(
      { level: "info" },
      {
        write(chunk: string) {
          lines.push(JSON.parse(chunk) as Record<string, unknown>);
        },
      },
    );

    await reviewKyte(store, createNoneProvider(), { kyteId: "k_test", publishSeq: 3, reviewedBy: null }, capturing);

    expect(lines.at(-1)).toMatchObject({ outcome: "stale_event", eventSeq: 3, currentSeq: 5 });
  });
});

describe("reviewKyte — provider=openai (mocked client)", () => {
  it("approves and records signals from a mocked structured-output response", async () => {
    const client: OpenAiChatClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(
            jsonMessage({
              verdict: "APPROVE",
              categories: [],
              confidence: 0.95,
              reason: "Looks like an ordinary profile.",
              signals: { nsfw_image: false, nsfw_text: false, sus_link: [], sus_redirect: false },
            }),
          ),
        },
      },
    } as unknown as OpenAiChatClient;
    const provider = createOpenAiProvider({ client, model: "gpt-5-mini" });
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.provider).toBe("openai");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.reviews).toHaveLength(1);
  });

  it("suspends and records nsfw + link signals from a mocked structured-output response", async () => {
    const client: OpenAiChatClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(
            jsonMessage({
              verdict: "SUSPEND",
              categories: ["nsfw"],
              confidence: 0.9,
              reason: "Avatar is explicit.",
              signals: {
                nsfw_image: true,
                nsfw_text: false,
                sus_link: ["https://example.com/adult"],
                sus_redirect: false,
              },
            }),
          ),
        },
      },
    } as unknown as OpenAiChatClient;
    const provider = createOpenAiProvider({ client, model: "gpt-5-mini" });
    const snapshot = buildSnapshot({ links: [{ title: "18+", url: "https://example.com/adult" }] });
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    const review = store.reviews[0]!;
    expect(review.signals.nsfw_image?.reason).toBe("Avatar is explicit.");
    expect(review.signals.sus_link?.[0]?.url).toBe("https://example.com/adult");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
    expect(store.suspendedEmailCalls).toHaveLength(1);
  });
});

describe("reviewKyte — publishSeq ordering guard", () => {
  it("no-ops the status write when a newer publish exists", async () => {
    const store = createFakeModerationStore([buildSnapshot({ publishSeq: 5 })]);
    const provider: ModerationProvider = {
      name: "openai",
      review: vi.fn().mockResolvedValue({
        verdict: "SUSPEND",
        categories: ["phishing"],
        confidence: 0.9,
        reason: "looks bad",
        signals: {},
      }),
    };

    const outcome = await reviewKyte(store, provider, { kyteId: "k_test", publishSeq: 3, reviewedBy: null }, log);

    expect(outcome.kind).toBe("stale_event");
    expect(provider.review).not.toHaveBeenCalled();
    expect(store.reviews).toHaveLength(0);
    expect(store.kytes.get("k_test")?.moderationStatus).toBe("APPROVED");
  });

  it("writes the review but does not apply the status when a newer publish races in mid-flight", async () => {
    const snapshot = buildSnapshot({ publishSeq: 1 });
    const store = createFakeModerationStore([snapshot]);
    const provider: ModerationProvider = {
      name: "openai",
      review: vi.fn().mockImplementation(async () => {
        store.kytes.get(snapshot.kyteId)!.publishSeq = 2;
        return {
          verdict: "SUSPEND",
          categories: ["phishing"],
          confidence: 0.9,
          reason: "looks bad",
          signals: {},
        };
      }),
    };

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: 1, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.statusApplied).toBe(false);
    expect(store.reviews).toHaveLength(1);
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.size).toBe(0);
    expect(store.revalidateCalls).toHaveLength(0);
  });
});

describe("reviewKyte — fail-open on provider error", () => {
  it("retries three times then approves with review_failed + admin alert", async () => {
    const client: OpenAiChatClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("network down")),
        },
      },
    } as unknown as OpenAiChatClient;
    const provider = createOpenAiProvider({ client, model: "gpt-5-mini", retryDelayMs: 0 });
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);

    const outcome = await reviewKyte(
      store,
      provider,
      { kyteId: snapshot.kyteId, publishSeq: snapshot.publishSeq, reviewedBy: null },
      log,
    );

    expect(outcome.kind).toBe("reviewed");
    if (outcome.kind !== "reviewed") throw new Error("unreachable");
    expect(outcome.result.verdict).toBe("APPROVE");
    expect(outcome.result.categories).toContain("review_failed");
    expect(client.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.alerts).toHaveLength(1);
    expect(store.alerts[0]?.kind).toBe("moderation_fail_open");
  });
});
