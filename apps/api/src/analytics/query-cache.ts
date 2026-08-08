import type Redis from "ioredis";

const DEFAULT_TTL_SEC = 60;

export function analyticsQueryCacheKey(kyteId: string, query: string, args: unknown): string {
  return `analytics:${kyteId}:${query}:${JSON.stringify(args)}`;
}

export async function withQueryCache<T>(
  redis: Pick<Redis, "get" | "set">,
  key: string,
  compute: () => Promise<T>,
  ttlSec: number = DEFAULT_TTL_SEC,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) return JSON.parse(cached) as T;
  } catch {
    // A cache read failure just means we recompute — never fatal.
  }

  const value = await compute();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    // A cache write failure only costs a cache miss next time.
  }

  return value;
}
