import type Redis from "ioredis";
import type { RateLimitRule } from "@kytelink/schemas";
import type { RateLimitDecision, RateLimiter } from "../trpc/rate-limit";

// `key` already carries the `rl:{class}:{subject}:{value}` prefix applied by
// enforceRateLimit (apps/api/src/trpc/rate-limit.ts) — no extra prefix here.
export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: Pick<Redis, "incr" | "pexpire" | "pttl">) {}

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, rule.windowSec * 1000);
    }
    if (count <= rule.limit) {
      return { allowed: true, retryAfterSec: 0 };
    }
    const ttlMs = await this.redis.pttl(key);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)) };
  }
}
