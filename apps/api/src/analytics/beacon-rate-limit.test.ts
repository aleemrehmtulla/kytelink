import { describe, expect, it } from "vitest";
import type { RateLimitRule } from "@kytelink/schemas";
import { RedisRateLimiter } from "./beacon-rate-limit";

function fakeRedis() {
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  return {
    incr: async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    pexpire: async (key: string, ms: number) => {
      ttls.set(key, ms);
      return 1;
    },
    pttl: async (key: string) => ttls.get(key) ?? -1,
  };
}

const rule: RateLimitRule = { limit: 2, windowSec: 60, subject: "ip" };

describe("RedisRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = new RedisRateLimiter(fakeRedis());
    expect((await limiter.consume("rl:beacon:ip:1.2.3.4", rule)).allowed).toBe(true);
    expect((await limiter.consume("rl:beacon:ip:1.2.3.4", rule)).allowed).toBe(true);
  });

  it("rejects requests once the limit is exceeded and reports a retry-after", async () => {
    const limiter = new RedisRateLimiter(fakeRedis());
    const key = "rl:beacon:ip:1.2.3.4";
    await limiter.consume(key, rule);
    await limiter.consume(key, rule);
    const third = await limiter.consume(key, rule);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const limiter = new RedisRateLimiter(fakeRedis());
    await limiter.consume("rl:beacon:ip:1.1.1.1", rule);
    await limiter.consume("rl:beacon:ip:1.1.1.1", rule);
    const other = await limiter.consume("rl:beacon:ip:2.2.2.2", rule);
    expect(other.allowed).toBe(true);
  });
});
