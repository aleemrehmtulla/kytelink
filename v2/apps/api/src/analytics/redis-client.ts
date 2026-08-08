import Redis from "ioredis";
import { taggedLogger } from "../logger";

const log = taggedLogger("analytics");

let client: Redis | undefined;

// REDIS_URL is a required boot var (apps/api/src/env.ts) so this connection
// is always attempted; every caller in src/analytics/ still wraps use of it
// in try/catch so a transient Redis blip degrades instead of throwing. The
// "error" listener is required — ioredis rethrows unhandled "error" events
// and would otherwise crash the process on a connection blip.
export function getAnalyticsRedis(url: string = process.env.REDIS_URL ?? "redis://localhost:6379"): Redis {
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false });
    client.on("error", (error: Error) => {
      log.warn({ err: error }, "redis connection error — beacons buffer in memory until it recovers");
    });
  }
  return client;
}
