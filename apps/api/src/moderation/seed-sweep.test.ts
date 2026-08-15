import { describe, expect, it } from "vitest";
import pino from "pino";
import { moderationSweepProgressSchema } from "@kytelink/trpc";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { runSeedSweep, type SweepSnapshot } from "./seed-sweep";
import type { ModerationProvider } from "./types";

const log = pino({ level: "silent" });

function snapshots(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildSnapshot({ kyteId: `k_${index}`, username: `user${index}` }),
  );
}

/** Suspensions only ever come from an AI verdict now, so the sweep is tested through one. */
function providerSuspending(...kyteIds: string[]): ModerationProvider {
  return {
    name: "openai",
    review: (snapshot) =>
      Promise.resolve(
        kyteIds.includes(snapshot.kyteId)
          ? {
              verdict: "SUSPEND" as const,
              categories: ["phishing"],
              confidence: 0.95,
              reason: "confirmed phishing page",
              signals: {},
            }
          : {
              verdict: "APPROVE" as const,
              categories: [],
              confidence: 0.99,
              reason: "ordinary profile",
              signals: {},
            },
      ),
  };
}

describe("the sweep progress contract", () => {
  it("round-trips a cancelled blob through the wire schema", () => {
    const blob = {
      total: 7713,
      processed: 2401,
      reviewed: 2400,
      suspended: 12,
      approved: 2388,
      skipped: 0,
      failed: 1,
      startedAt: "2026-08-15T00:00:00.000Z",
      finishedAt: "2026-08-15T00:04:00.000Z",
      requestedBy: "agent-admin@kytelink.dev",
      recent: [
        {
          kyteId: "k_1",
          username: "someone",
          verdict: "SUSPEND" as const,
          changed: true,
          reason: "confirmed phishing page",
          at: "2026-08-15T00:03:59.000Z",
        },
      ],
      runId: "run_abc",
      state: "cancelled" as const,
      cancelledBy: "boss@kytelink.dev",
    };

    const parsed = moderationSweepProgressSchema.parse(JSON.parse(JSON.stringify(blob)));

    expect(parsed).toEqual(blob);
  });

  it("accepts every state the query can hand back", () => {
    for (const state of ["running", "finished", "cancelled", "interrupted"] as const) {
      const parsed = moderationSweepProgressSchema.parse({
        total: 1,
        processed: 0,
        reviewed: 0,
        suspended: 0,
        approved: 0,
        skipped: 0,
        failed: 0,
        startedAt: "2026-08-15T00:00:00.000Z",
        finishedAt: null,
        requestedBy: "a@b.c",
        runId: "r",
        state,
      });
      expect(parsed.state).toBe(state);
    }
  });

  it("defaults the new fields so a blob from the previous build still parses", () => {
    const parsed = moderationSweepProgressSchema.parse({
      total: 7713,
      processed: 4200,
      reviewed: 4200,
      suspended: 8,
      approved: 4192,
      skipped: 0,
      failed: 0,
      startedAt: "2026-08-15T00:00:00.000Z",
      finishedAt: null,
      requestedBy: "agent-admin@kytelink.dev",
    });

    expect(parsed.runId).toBe("");
    expect(parsed.state).toBe("running");
    expect(parsed.cancelledBy).toBeNull();
    expect(parsed.recent).toEqual([]);
  });
});

describe("runSeedSweep", () => {
  it("reviews every published kyte and tallies verdicts", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "k_clean" }),
      buildSnapshot({ kyteId: "k_spam" }),
    ]);

    const result = await runSeedSweep(store, providerSuspending("k_spam"), log);

    expect(result.reviewed).toBe(2);
    expect(result.suspended).toBe(1);
    expect(result.approved).toBe(1);
    expect(store.kytes.get("k_spam")?.moderationStatus).toBe("SUSPENDED");
    expect(store.kytes.get("k_clean")?.moderationStatus).toBe("APPROVED");
  });

  it("reports the total before the first review and then every N kytes", async () => {
    const store = createFakeModerationStore(snapshots(5));
    const seen: SweepSnapshot[] = [];

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      concurrency: 1,
      progressEvery: 2,
      progressThrottleMs: 0,
      onProgress: (snapshot) => {
        seen.push(snapshot);
        return Promise.resolve();
      },
    });

    expect(seen[0]).toMatchObject({ total: 5, processed: 0 });
    expect(seen.map((snapshot) => snapshot.processed)).toEqual([0, 2, 4]);
    expect(seen.every((snapshot) => snapshot.total === 5)).toBe(true);
    expect(result.processed).toBe(5);
  });

  it("throttles progress writes instead of one per completion", async () => {
    const store = createFakeModerationStore(snapshots(40));
    let writes = 0;

    await runSeedSweep(store, createNoneProvider(), log, {
      progressEvery: 1,
      progressThrottleMs: 10_000,
      onProgress: () => {
        writes += 1;
        return Promise.resolve();
      },
    });

    // Only the opening frame: 40 fast completions inside one throttle window.
    expect(writes).toBe(1);
  });

  it("keeps a newest-first ring buffer of the last 15 reviews", async () => {
    const store = createFakeModerationStore(snapshots(40));

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      concurrency: 1,
    });

    expect(result.recent).toHaveLength(15);
    expect(result.recent[0]?.username).toBe("user39");
    expect(result.recent[14]?.username).toBe("user25");
    expect(result.recent[0]).toMatchObject({ verdict: "APPROVE", changed: false });
    expect(result.recent[0]?.reason.length).toBeGreaterThan(0);
  });

  it("records a suspension in the activity feed as a status change", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "k_spam", username: "spam" }),
    ]);

    const result = await runSeedSweep(store, providerSuspending("k_spam"), log);

    expect(result.recent[0]).toMatchObject({
      username: "spam",
      verdict: "SUSPEND",
      changed: true,
    });
  });

  it("tallies correctly with many reviews completing concurrently", async () => {
    const store = createFakeModerationStore(snapshots(200));
    let inFlight = 0;
    let maxInFlight = 0;
    const jittery: ModerationProvider = {
      name: "none",
      async review(snapshot) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 4));
        inFlight -= 1;
        return createNoneProvider().review(snapshot);
      },
    };

    const result = await runSeedSweep(store, jittery, log, { concurrency: 16 });

    expect(maxInFlight).toBe(16);
    expect(result.processed).toBe(200);
    expect(result.reviewed).toBe(200);
    expect(result.approved + result.suspended).toBe(200);
    expect(result.failed).toBe(0);
    expect(store.reviews).toHaveLength(200);
  });

  it("a failing review never stalls the pool or loses the rest", async () => {
    const store = createFakeModerationStore(snapshots(60));
    const original = store.writeReview.bind(store);
    store.writeReview = (review) =>
      review.kyteId.endsWith("7")
        ? Promise.reject(new Error("db is unhappy"))
        : original(review);

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      concurrency: 8,
    });

    expect(result.processed).toBe(60);
    expect(result.failed).toBe(6);
    expect(result.reviewed).toBe(54);
    expect(result.recent.some((entry) => entry.verdict === "FAILED")).toBe(true);
  });

  it("stops claiming once cancelled but drains what it already started", async () => {
    const store = createFakeModerationStore(snapshots(200));
    let inFlight = 0;
    let peakInFlight = 0;
    const slow: ModerationProvider = {
      name: "none",
      review: async (snapshot) => {
        inFlight += 1;
        peakInFlight = Math.max(peakInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 2));
        inFlight -= 1;
        return createNoneProvider().review(snapshot);
      },
    };

    const result = await runSeedSweep(store, slow, log, {
      concurrency: 8,
      progressEvery: 1,
      progressThrottleMs: 0,
      shouldCancel: () => Promise.resolve(true),
    });

    expect(result.cancelled).toBe(true);
    expect(result.processed).toBeLessThan(200);
    // Whatever was claimed was carried all the way through — no half-reviews.
    expect(result.reviewed + result.skipped + result.failed).toBe(result.processed);
    expect(store.reviews).toHaveLength(result.reviewed);
    expect(inFlight).toBe(0);
    expect(peakInFlight).toBeLessThanOrEqual(8);
  });

  it("runs to completion when the cancel check never fires", async () => {
    const store = createFakeModerationStore(snapshots(40));

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      progressEvery: 1,
      progressThrottleMs: 0,
      shouldCancel: () => Promise.resolve(false),
    });

    expect(result.cancelled).toBe(false);
    expect(result.processed).toBe(40);
  });

  it("keeps sweeping when the cancel check itself throws", async () => {
    const store = createFakeModerationStore(snapshots(20));

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      progressEvery: 1,
      progressThrottleMs: 0,
      shouldCancel: () => Promise.reject(new Error("redis is gone")),
    });

    expect(result.cancelled).toBe(false);
    expect(result.processed).toBe(20);
  });

  it("survives a progress sink that throws", async () => {
    const store = createFakeModerationStore(snapshots(20));

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      progressEvery: 1,
      progressThrottleMs: 0,
      onProgress: () => Promise.reject(new Error("redis is gone")),
    });

    expect(result.processed).toBe(20);
    expect(result.reviewed).toBe(20);
  });

  it("stamps the caller's label on every review it writes", async () => {
    const store = createFakeModerationStore(snapshots(2));

    await runSeedSweep(store, createNoneProvider(), log, {
      reviewedBy: "admin-sweep:agent-admin@kytelink.dev",
    });

    expect(store.reviews.map((review) => review.reviewedBy)).toEqual([
      "admin-sweep:agent-admin@kytelink.dev",
      "admin-sweep:agent-admin@kytelink.dev",
    ]);
  });

  it("only reports kytes whose status actually moved", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "k_stays", username: "stays" }),
      buildSnapshot({
        kyteId: "k_flips",
        username: "flips",
        moderationStatus: "SUSPENDED",
      }),
      buildSnapshot({ kyteId: "k_down", username: "down" }),
    ]);

    const result = await runSeedSweep(store, providerSuspending("k_down"), log);

    expect(result.changed).toEqual([
      { kyteId: "k_flips", username: "flips", suspended: false },
      { kyteId: "k_down", username: "down", suspended: true },
    ]);
  });

  it("keeps going when the provider throws mid-sweep", async () => {
    const store = createFakeModerationStore(snapshots(3));
    const exploding: ModerationProvider = {
      name: "openai",
      review: () => Promise.reject(new Error("provider is down")),
    };

    const result = await runSeedSweep(store, exploding, log);

    expect(result.reviewed).toBe(3);
    expect(result.approved).toBe(3);
    expect(result.failed).toBe(0);
    expect(store.alerts.map((alert) => alert.kind)).toEqual([
      "moderation_fail_open",
      "moderation_fail_open",
      "moderation_fail_open",
    ]);
  });

  it("keeps going when the store throws on one kyte", async () => {
    const store = createFakeModerationStore(snapshots(3));
    const original = store.writeReview.bind(store);
    store.writeReview = (review) =>
      review.kyteId === "k_1"
        ? Promise.reject(new Error("db is unhappy"))
        : original(review);

    const result = await runSeedSweep(store, createNoneProvider(), log);

    expect(result.processed).toBe(3);
    expect(result.reviewed).toBe(2);
    expect(result.failed).toBe(1);
  });
});
