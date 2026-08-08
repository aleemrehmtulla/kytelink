import { describe, expect, it } from "vitest";
import { dbConcurrency, mapPooled, DEFAULT_DB_CONCURRENCY } from "./backfill";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("mapPooled", () => {
  it("processes every item exactly once", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const seen: number[] = [];
    await mapPooled(items, 16, async (item) => {
      await tick();
      seen.push(item);
    });
    expect(seen).toHaveLength(1000);
    expect(new Set(seen).size).toBe(1000);
  });

  it("never exceeds the concurrency cap", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapPooled(Array.from({ length: 200 }, (_, i) => i), 8, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
    });
    expect(peak).toBeLessThanOrEqual(8);
    expect(peak).toBeGreaterThan(1);
  });

  it("handles an empty list and a concurrency above the item count", async () => {
    await expect(mapPooled([], 16, async () => {})).resolves.toBeUndefined();
    const seen: number[] = [];
    await mapPooled([1, 2], 64, async (n) => {
      seen.push(n);
    });
    expect([...seen].sort()).toEqual([1, 2]);
  });

  it("runs serially at concurrency 1, preserving the injected-crash seam", async () => {
    const order: number[] = [];
    let inFlight = 0;
    let peak = 0;
    await mapPooled([1, 2, 3, 4], 1, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      order.push(n);
      inFlight -= 1;
    });
    expect(peak).toBe(1);
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("propagates a worker failure rather than silently dropping rows", async () => {
    await expect(
      mapPooled([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});

describe("dbConcurrency", () => {
  it("defaults when unset and reads a valid override", () => {
    expect(dbConcurrency({})).toBe(DEFAULT_DB_CONCURRENCY);
    expect(dbConcurrency({ BACKFILL_DB_CONCURRENCY: "32" })).toBe(32);
  });

  it("falls back on junk rather than dropping to zero workers", () => {
    expect(dbConcurrency({ BACKFILL_DB_CONCURRENCY: "0" })).toBe(DEFAULT_DB_CONCURRENCY);
    expect(dbConcurrency({ BACKFILL_DB_CONCURRENCY: "nope" })).toBe(DEFAULT_DB_CONCURRENCY);
  });
});
