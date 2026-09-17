import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { forceReReviewKyte } from "./admin-actions";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import type { ModerationProvider } from "./types";

const log = pino({ level: "silent" });

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
