import { describe, expect, it } from "vitest";
import { createConcurrencyQueue, runWithConcurrency } from "./concurrency-queue";

describe("createConcurrencyQueue", () => {
  it("never runs more than `limit` tasks at once", async () => {
    const queue = createConcurrencyQueue(2);
    let active = 0;
    let maxActive = 0;

    const task = async (): Promise<void> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    };

    await Promise.all(Array.from({ length: 6 }, () => queue.run(task)));

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("propagates task results and errors", async () => {
    const queue = createConcurrencyQueue(1);
    await expect(queue.run(() => Promise.resolve(42))).resolves.toBe(42);
    await expect(queue.run(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});

describe("runWithConcurrency", () => {
  it("visits every item exactly once, at the configured width", async () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    const seen: number[] = [];
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency(items, 8, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      seen.push(item);
      active -= 1;
    });

    expect(seen).toHaveLength(50);
    expect([...seen].sort((a, b) => a - b)).toEqual(items);
    expect(maxActive).toBe(8);
  });

  it("hands each worker the index of the item it was given", async () => {
    const pairs: [string, number][] = [];

    await runWithConcurrency(["a", "b", "c"], 2, (item, index) => {
      pairs.push([item, index]);
      return Promise.resolve();
    });

    expect(pairs.sort((left, right) => left[1] - right[1])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("never opens more workers than there are items", async () => {
    let maxActive = 0;
    let active = 0;

    await runWithConcurrency([1, 2], 16, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });

    expect(maxActive).toBe(2);
  });

  it("stops claiming when shouldStop turns true, and reports it", async () => {
    const items = Array.from({ length: 100 }, (_, index) => index);
    let stop = false;
    const seen: number[] = [];

    const result = await runWithConcurrency(
      items,
      4,
      async (item) => {
        seen.push(item);
        if (seen.length === 20) stop = true;
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
      { shouldStop: () => stop },
    );

    expect(result.stopped).toBe(true);
    expect(result.claimed).toBe(seen.length);
    // The four in-flight workers each finish their current item, so a handful
    // past the trigger is expected — but nowhere near the whole list.
    expect(seen.length).toBeGreaterThanOrEqual(20);
    expect(seen.length).toBeLessThan(40);
  });

  it("reports not-stopped and a full claim count on a clean run", async () => {
    const result = await runWithConcurrency([1, 2, 3, 4], 2, () => Promise.resolve(), {
      shouldStop: () => false,
    });

    expect(result).toEqual({ claimed: 4, stopped: false });
  });

  it("claims nothing when shouldStop is true from the start", async () => {
    let calls = 0;
    const result = await runWithConcurrency(
      [1, 2, 3],
      2,
      () => {
        calls += 1;
        return Promise.resolve();
      },
      { shouldStop: () => true },
    );

    expect(calls).toBe(0);
    expect(result).toEqual({ claimed: 0, stopped: true });
  });

  it("does nothing for an empty list", async () => {
    let calls = 0;
    await runWithConcurrency([], 4, () => {
      calls += 1;
      return Promise.resolve();
    });
    expect(calls).toBe(0);
  });
});
