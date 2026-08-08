import { describe, expect, it } from "vitest";
import pino from "pino";
import { buildSnapshot } from "./fixtures";
import { createFakeModerationStore } from "./fake-store";
import { createNoneProvider } from "./provider-none";
import { runSeedSweep } from "./seed-sweep";

const log = pino({ level: "silent" });

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
});
