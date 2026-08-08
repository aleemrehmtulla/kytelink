import type Redis from "ioredis";
import type { Logger } from "pino";
import type { Clickhouse, LinkHitRow, PageHitRow, ProductEventRow } from "@kytelink/clickhouse";
import { drainBufferedRows } from "./clickhouse-buffer";

const DEFAULT_DRAIN_INTERVAL_MS = 5000;

export interface BufferWorkerDeps {
  ch: Clickhouse;
  redis: Pick<Redis, "lpop" | "lpush" | "llen" | "rpush">;
  log?: Pick<Logger, "warn" | "error">;
}

async function drainAllBuffers(deps: BufferWorkerDeps): Promise<void> {
  if (!deps.ch.enabled) return;
  await drainBufferedRows<PageHitRow>(deps, "page_hits", (rows) => deps.ch.insertPageHits(rows));
  await drainBufferedRows<LinkHitRow>(deps, "link_hits", (rows) => deps.ch.insertLinkHits(rows));
  await drainBufferedRows<ProductEventRow>(deps, "product_events", (rows) => deps.ch.insertProductEvents(rows));
}

export function startBufferDrainWorker(deps: BufferWorkerDeps, intervalMs = DEFAULT_DRAIN_INTERVAL_MS): () => void {
  const timer = setInterval(() => {
    void drainAllBuffers(deps);
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
