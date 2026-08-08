import { getDb } from "@kytelink/db";
import { getClickhouse } from "@kytelink/clickhouse";
import type { AnalyticsSeam } from "../seams/analytics-seam";
import { taggedLogger } from "../logger";
import { createAnalyticsRouter } from "./analytics-router";
import { startBufferDrainWorker } from "./buffer-worker";
import { ingestBeacon } from "./ingest-beacon";
import { recordProductEvent } from "./record-event";
import { getAnalyticsRedis } from "./redis-client";

const redis = getAnalyticsRedis();
const ch = getClickhouse();
const db = getDb();

const log = taggedLogger("analytics");

export const analyticsRouter = createAnalyticsRouter({ redis });

export const analyticsSeam: AnalyticsSeam = {
  ingestBeacon(kind, payload) {
    return ingestBeacon({ ch, redis, db, log }, kind, payload);
  },
  // Analytics is never on the critical path of the thing it measures: a signup
  // must not fail because ClickHouse is down, so every failure is swallowed.
  trackProductEvent(input) {
    void recordProductEvent({ ch, redis, log }, input).catch((error: unknown) => {
      log.warn({ err: error, event: input.event }, "dropped a server event — nothing else is affected");
    });
  },
};

export function startAnalyticsBackgroundJobs(): () => void {
  return startBufferDrainWorker({ ch, redis, log });
}

export { clearKyteMembership, refreshKyteMembership } from "./kyte-membership";
