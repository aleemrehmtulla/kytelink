import type Redis from "ioredis";
import type { Logger } from "pino";

const BUFFER_PREFIX = "analytics:buffer:";

export function bufferKey(table: string): string {
  return `${BUFFER_PREFIX}${table}`;
}

export interface BufferDeps {
  redis: Pick<Redis, "rpush" | "lpush" | "lpop" | "llen">;
  log?: Pick<Logger, "warn" | "error">;
}

// CH briefly down → push the rows a beacon would have inserted onto a Redis
// list instead of failing the request; a drain worker replays them once CH
// is reachable again. Never throws — a Redis push failure just drops the
// rows (still no 5xx, no blocked beacon).
export async function insertOrBuffer<T>(
  deps: BufferDeps,
  table: string,
  rows: readonly T[],
  insert: (rows: T[]) => Promise<void>,
): Promise<void> {
  if (rows.length === 0) return;
  try {
    await insert([...rows]);
  } catch (error) {
    deps.log?.warn(
      { err: error, table, count: rows.length },
      "clickhouse insert failed — buffered these rows to redis and will retry on the next drain",
    );
    try {
      await deps.redis.rpush(bufferKey(table), ...rows.map((row) => JSON.stringify(row)));
    } catch (bufferError) {
      deps.log?.error({ err: bufferError, table }, "clickhouse and redis are both unreachable — dropped these rows for good");
    }
  }
}

export interface DrainResult {
  drained: number;
  remaining: number;
}

export async function drainBufferedRows<T>(
  deps: BufferDeps,
  table: string,
  insert: (rows: T[]) => Promise<void>,
  batchSize = 200,
): Promise<DrainResult> {
  const key = bufferKey(table);
  let popped: string[];
  try {
    popped = (await deps.redis.lpop(key, batchSize)) ?? [];
  } catch (error) {
    deps.log?.warn({ err: error, table }, "could not read the redis buffer — leaving the rows queued for the next drain");
    return { drained: 0, remaining: 0 };
  }
  if (popped.length === 0) return { drained: 0, remaining: 0 };

  const rows = popped.map((raw) => JSON.parse(raw) as T);
  try {
    await insert(rows);
  } catch (error) {
    deps.log?.warn({ err: error, table, count: rows.length }, "clickhouse still unreachable — put the rows back on the redis buffer");
    try {
      await deps.redis.lpush(key, ...[...popped].reverse());
    } catch (bufferError) {
      deps.log?.error({ err: bufferError, table }, "could not put the rows back on the redis buffer — dropped them for good");
    }
    return { drained: 0, remaining: popped.length };
  }

  const remaining = await deps.redis.llen(key).catch(() => 0);
  return { drained: rows.length, remaining };
}
