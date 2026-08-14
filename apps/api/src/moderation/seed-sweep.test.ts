import { describe, expect, it } from "vitest";
import pino from "pino";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { runSeedSweep, type SweepTally } from "./seed-sweep";
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
      buildSnapshot({ kyteId: "k_spam", displayName: "Rogers Support" }),
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
    const seen: SweepTally[] = [];

    const result = await runSeedSweep(store, createNoneProvider(), log, {
      progressEvery: 2,
      onProgress: (tally) => {
        seen.push(tally);
        return Promise.resolve();
      },
    });

    expect(seen[0]).toMatchObject({ total: 5, processed: 0 });
    expect(seen.map((tally) => tally.processed)).toEqual([0, 2, 4]);
    expect(seen.every((tally) => tally.total === 5)).toBe(true);
    expect(result.processed).toBe(5);
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
      buildSnapshot({ kyteId: "k_flips", username: "flips", moderationStatus: "SUSPENDED" }),
      buildSnapshot({ kyteId: "k_down", username: "down", displayName: "Rogers Support" }),
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
      review.kyteId === "k_1" ? Promise.reject(new Error("db is unhappy")) : original(review);

    const result = await runSeedSweep(store, createNoneProvider(), log);

    expect(result.processed).toBe(3);
    expect(result.reviewed).toBe(2);
    expect(result.failed).toBe(1);
  });
});
