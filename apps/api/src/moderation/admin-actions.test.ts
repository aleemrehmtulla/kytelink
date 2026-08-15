import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { approveKyte, forceReReviewKyte, suspendKyte } from "./admin-actions";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import type { ModerationProvider } from "./types";

const log = pino({ level: "silent" });

describe("approveKyte", () => {
  it("sets APPROVED, un-quarantines, and revalidates", async () => {
    const snapshot = buildSnapshot({ moderationStatus: "SUSPENDED" });
    const store = createFakeModerationStore([snapshot]);
    store.quarantinedKyteIds.add(snapshot.kyteId);

    await approveKyte(store, snapshot.kyteId);

    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("APPROVED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(false);
    expect(store.revalidateCalls).toHaveLength(1);
    expect(store.restoredEmailCalls).toHaveLength(1);
  });

  it("does not email owners when the kyte was not suspended", async () => {
    const snapshot = buildSnapshot({ moderationStatus: "APPROVED" });
    const store = createFakeModerationStore([snapshot]);

    await approveKyte(store, snapshot.kyteId);

    expect(store.restoredEmailCalls).toHaveLength(0);
  });
});

describe("suspendKyte", () => {
  it("sets SUSPENDED and keeps assets quarantined", async () => {
    const snapshot = buildSnapshot({ moderationStatus: "APPROVED" });
    const store = createFakeModerationStore([snapshot]);

    await suspendKyte(store, snapshot.kyteId);

    expect(store.kytes.get(snapshot.kyteId)?.moderationStatus).toBe("SUSPENDED");
    expect(store.quarantinedKyteIds.has(snapshot.kyteId)).toBe(true);
    expect(store.revalidateCalls).toHaveLength(1);
  });
});

describe("forceReReviewKyte", () => {
  it("bypasses the content-hash cache", async () => {
    const snapshot = buildSnapshot();
    const store = createFakeModerationStore([snapshot]);
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

    await forceReReviewKyte(store, provider, log, snapshot.kyteId, "admin_1");
    expect(store.reviews).toHaveLength(1);

    const second = await forceReReviewKyte(store, provider, log, snapshot.kyteId, "admin_1");
    expect(second.kind).toBe("reviewed");
    expect(provider.review).toHaveBeenCalledTimes(2);
    expect(store.reviews).toHaveLength(2);
    expect(store.reviews[1]?.reviewedBy).toBe("admin_1");
  });
});
