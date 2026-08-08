import { describe, expect, it } from "vitest";
import { imageProcessConcurrency, imageProcessQueue } from "./image-process-queue";

describe("imageProcessQueue", () => {
  it("caps concurrency at ~(cores - 1) and never runs more than that many tasks at once", async () => {
    expect(imageProcessConcurrency).toBeGreaterThanOrEqual(1);

    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: imageProcessConcurrency * 3 }, () =>
      imageProcessQueue.run(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      }),
    );

    await Promise.all(tasks);
    expect(maxActive).toBeLessThanOrEqual(imageProcessConcurrency);
  });

  it("propagates task failures without deadlocking the queue for later tasks", async () => {
    await expect(
      imageProcessQueue.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await imageProcessQueue.run(async () => "still works");
    expect(result).toBe("still works");
  });
});
