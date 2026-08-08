import { describe, expect, it, vi } from "vitest";
import type Redis from "ioredis";
import { analyticsQueryCacheKey, withQueryCache } from "./query-cache";

function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
  };
}

describe("analyticsQueryCacheKey", () => {
  it("matches the analytics:{kyteId}:{query}:{args} shape from doc 02", () => {
    expect(analyticsQueryCacheKey("k_agent", "overview", { days: 30 })).toBe(
      'analytics:k_agent:overview:{"days":30}',
    );
  });
});

describe("withQueryCache", () => {
  it("computes and caches on a miss", async () => {
    const redis = fakeRedis();
    const compute = vi.fn().mockResolvedValue({ totalViews: 5 });

    const result = await withQueryCache(redis as unknown as Redis, "k1", compute);

    expect(result).toEqual({ totalViews: 5 });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(redis.store.get("k1")).toBe(JSON.stringify({ totalViews: 5 }));
  });

  it("returns the cached value on a hit without recomputing", async () => {
    const redis = fakeRedis();
    redis.store.set("k1", JSON.stringify({ totalViews: 42 }));
    const compute = vi.fn();

    const result = await withQueryCache(redis as unknown as Redis, "k1", compute);

    expect(result).toEqual({ totalViews: 42 });
    expect(compute).not.toHaveBeenCalled();
  });

  it("falls through to compute when redis reads fail", async () => {
    const redis = { get: vi.fn().mockRejectedValue(new Error("down")), set: vi.fn() };
    const compute = vi.fn().mockResolvedValue({ totalViews: 1 });

    await expect(withQueryCache(redis as unknown as Redis, "k1", compute)).resolves.toEqual({
      totalViews: 1,
    });
  });
});
