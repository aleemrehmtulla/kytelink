import IORedis, { type Redis } from "ioredis";

let cached: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/**
 * BullMQ needs a concrete ioredis client, and ctx.redis is typed opaque
 * (packages/trpc context.ts), so the image/og/quarantine queues open their own
 * connection from REDIS_URL — already a required boot var everywhere else.
 */
export function getAssetsRedisConnection(): Redis {
  if (cached) return cached;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured");
  cached = new IORedis(url, { maxRetriesPerRequest: null });
  return cached;
}
