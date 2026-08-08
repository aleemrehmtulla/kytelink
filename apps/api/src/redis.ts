import { Redis } from "ioredis";
import { taggedLogger } from "./logger";

const log = taggedLogger("redis");

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    client.on("error", (error) => {
      log.error(
        { err: error },
        "connection error — queues, rate limits and caches stay degraded until it recovers",
      );
    });
  }
  return client;
}
