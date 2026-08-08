import { TRPCError } from "@trpc/server";
import {
  RATE_LIMIT_CLASSES,
  type RateLimitClass,
  type RateLimitRule,
  type RateLimitSubject,
} from "@kytelink/schemas";

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
}

// A TOO_MANY_REQUESTS error that also carries the retry window, so callers
// (the tRPC responseMeta hook, the /auth and /report Fastify limits) can emit a
// `Retry-After` header instead of hiding the value inside the message (L1).
class RateLimitError extends TRPCError {
  constructor(public readonly retryAfterSec: number) {
    super({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Retry in ${retryAfterSec}s.`,
    });
    this.name = "RateLimitError";
  }
}

export function retryAfterOf(error: unknown): number | null {
  return error instanceof RateLimitError ? error.retryAfterSec : null;
}

export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision>;
}

interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

export function isRedisLike(value: unknown): value is RedisLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RedisLike).incr === "function"
  );
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: RedisLike) {}

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, rule.windowSec);
    }
    if (count > rule.limit) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -2) {
        // Key expired between incr and ttl — the window already elapsed.
        return { allowed: true, retryAfterSec: 0 };
      }
      if (ttl === -1) {
        // incr/expire are not atomic: a crash between them leaves a key with no
        // TTL, which would lock the subject out forever. Repair it here.
        await this.redis.expire(key, rule.windowSec);
        return { allowed: false, retryAfterSec: rule.windowSec };
      }
      return { allowed: false, retryAfterSec: ttl > 0 ? ttl : rule.windowSec };
    }
    return { allowed: true, retryAfterSec: 0 };
  }
}

export type RateLimitSubjectValues = Partial<Record<RateLimitSubject, string>>;

function subjectKey(subject: RateLimitSubject, values: RateLimitSubjectValues): string | null {
  if (subject === "global") return "global";
  if (subject === "ip+kyte") {
    const ip = values.ip;
    const kyte = values.kyte;
    return ip && kyte ? `${ip}:${kyte}` : null;
  }
  const value = values[subject];
  return value ? value : null;
}

export interface EnforceOptions {
  failOpen: boolean;
}

export async function enforceRateLimit(
  limiter: RateLimiter,
  className: RateLimitClass,
  values: RateLimitSubjectValues,
  options: EnforceOptions,
): Promise<void> {
  const rules = RATE_LIMIT_CLASSES[className];
  for (const rule of rules) {
    const subject = subjectKey(rule.subject, values);
    if (!subject) continue;
    const key = `rl:${className}:${rule.subject}:${subject}`;
    let decision: RateLimitDecision;
    try {
      decision = await limiter.consume(key, rule);
    } catch {
      if (options.failOpen) return;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Rate limiter unavailable." });
    }
    if (!decision.allowed) {
      throw new RateLimitError(decision.retryAfterSec);
    }
  }
}
