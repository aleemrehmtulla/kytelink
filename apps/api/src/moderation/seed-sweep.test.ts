import { describe, expect, it } from "vitest";
import pino from "pino";
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

describe("runSeedSweep", () => {
  it("reviews every published kyte and tallies verdicts", async () => {
    const store = createFakeModerationStore([
      buildSnapshot({ kyteId: "k_clean" }),
      buildSnapshot({
        kyteId: "k_spam",
        links: [{ title: "Track", url: "https://grabify.link/x" }],
      }),
    ]);

    const result = await runSeedSweep(store, createNoneProvider(), log);

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
      buildSnapshot({
        kyteId: "k_spam",
        username: "spam",
        links: [{ title: "Track", url: "https://grabify.link/x" }],
      }),
    ]);

    const result = await runSeedSweep(store, createNoneProvider(), log);

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
      buildSnapshot({
        kyteId: "k_down",
        username: "down",
        links: [{ title: "Track", url: "https://grabify.link/x" }],
      }),
    ]);

    const result = await runSeedSweep(store, createNoneProvider(), log);

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
