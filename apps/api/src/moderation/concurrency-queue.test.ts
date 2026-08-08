import { describe, expect, it } from "vitest";
import { createConcurrencyQueue } from "./concurrency-queue";

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
