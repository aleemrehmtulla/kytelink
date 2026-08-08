import { describe, expect, it, vi } from "vitest";
import type Redis from "ioredis";
import {
  clearKyteMembership,
  kyteMapKey,
  refreshKyteMembership,
  resolvePublishedKyteId,
  validateKyteMembership,
  type MembershipDeps,
} from "./kyte-membership";

function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  };
}

function depsWith(redis: MembershipDeps["redis"], findUnique: MembershipDeps["db"]["publishedKyte"]["findUnique"]): MembershipDeps {
  return {
    redis,
    db: { publishedKyte: { findUnique } } as MembershipDeps["db"],
    log: { warn: vi.fn(), error: vi.fn() },
  };
}

describe("resolvePublishedKyteId", () => {
  it("returns the redis-cached kyteId on a hit without touching postgres", async () => {
    const redis = fakeRedis();
    redis.store.set(kyteMapKey("agent"), "k_agent");
    const findUnique = vi.fn();
    const deps = depsWith(redis as unknown as Redis, findUnique);

    await expect(resolvePublishedKyteId(deps, "agent")).resolves.toBe("k_agent");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("falls back to ONE postgres lookup on a redis miss and caches the hit", async () => {
    const redis = fakeRedis();
    const findUnique = vi.fn().mockResolvedValue({ kyteId: "k_agent" });
    const deps = depsWith(redis as unknown as Redis, findUnique);

    await expect(resolvePublishedKyteId(deps, "agent")).resolves.toBe("k_agent");
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(redis.store.get(kyteMapKey("agent"))).toBe("k_agent");
  });

  it("caches a NONE tombstone when postgres has no match, and does not re-query on the next miss window", async () => {
    const redis = fakeRedis();
    const findUnique = vi.fn().mockResolvedValue(null);
    const deps = depsWith(redis as unknown as Redis, findUnique);

    await expect(resolvePublishedKyteId(deps, "ghost")).resolves.toBeNull();
    expect(redis.store.get(kyteMapKey("ghost"))).toBe("NONE");

    await expect(resolvePublishedKyteId(deps, "ghost")).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("survives a flushed/unreachable redis by falling straight through to postgres", async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error("connection reset")),
      set: vi.fn().mockRejectedValue(new Error("connection reset")),
    };
    const findUnique = vi.fn().mockResolvedValue({ kyteId: "k_agent" });
    const deps = depsWith(redis as unknown as Redis, findUnique);

    await expect(resolvePublishedKyteId(deps, "agent")).resolves.toBe("k_agent");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("validateKyteMembership", () => {
  it("accepts a beacon whose claimed kyteId matches the resolved membership", async () => {
    const redis = fakeRedis();
    redis.store.set(kyteMapKey("agent"), "k_agent");
    const deps = depsWith(redis as unknown as Redis, vi.fn());

    await expect(validateKyteMembership(deps, "agent", "k_agent")).resolves.toEqual({
      valid: true,
      kyteId: "k_agent",
    });
  });

  it("rejects a spoofed kyteId that does not match the real membership", async () => {
    const redis = fakeRedis();
    redis.store.set(kyteMapKey("agent"), "k_agent");
    const deps = depsWith(redis as unknown as Redis, vi.fn());

    await expect(validateKyteMembership(deps, "agent", "k_someone_else")).resolves.toEqual({
      valid: false,
      kyteId: null,
    });
    expect(deps.log?.warn).toHaveBeenCalled();
  });

  it("rejects a beacon for a username with no published mapping", async () => {
    const redis = fakeRedis();
    const findUnique = vi.fn().mockResolvedValue(null);
    const deps = depsWith(redis as unknown as Redis, findUnique);

    await expect(validateKyteMembership(deps, "nobody", "k_fake")).resolves.toEqual({
      valid: false,
      kyteId: null,
    });
  });
});

describe("refreshKyteMembership / clearKyteMembership", () => {
  it("writes and clears the redis mapping", async () => {
    const redis = fakeRedis();
    await refreshKyteMembership(redis as unknown as Redis, "agent", "k_agent");
    expect(redis.store.get(kyteMapKey("agent"))).toBe("k_agent");

    await clearKyteMembership(redis as unknown as Redis, "agent");
    expect(redis.store.has(kyteMapKey("agent"))).toBe(false);
  });
});
