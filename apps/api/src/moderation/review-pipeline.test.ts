import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { createOpenAiProvider, type OpenAiChatClient } from "./provider-openai";
import { reviewKyte } from "./review-pipeline";
import type { ModerationProvider } from "./types";

const log = pino({ level: "silent" });

function jsonMessage(payload: unknown): { choices: Array<{ message: { content: string } }> } {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
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

describe("reviewKyte — deterministic pre-checks", () => {
  it("suspends a brand-impersonation profile without calling the provider", async () => {
    const provider: ModerationProvider = { name: "openai", review: vi.fn() };
    const snapshot = buildSnapshot({
      displayName: "Bell Support Team",
      description: "Verify your account now",
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
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(outcome.result.provider).toBe("deterministic");
    expect(provider.review).not.toHaveBeenCalled();
    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
    expect(store.revalidateCalls).toHaveLength(1);
    expect(store.suspendedEmailCalls).toHaveLength(1);

    const review = store.reviews[0]!;
    expect(review.signals.sus_name?.keyword).toBe("bell");
  });

  it("suspends a punycode lookalike link without calling the provider", async () => {
    const provider: ModerationProvider = { name: "openai", review: vi.fn() };
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
    expect(outcome.result.verdict).toBe("SUSPEND");
    expect(outcome.result.provider).toBe("deterministic");
    expect(provider.review).not.toHaveBeenCalled();
    const review = store.reviews[0]!;
    expect(review.signals.sus_link?.[0]?.pattern).toBe("punycode_host");
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
