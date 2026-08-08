import type { z } from "zod";
import { productEventPropsSchemas, type ProductEvent } from "@kytelink/schemas";
import { formatClickhouseTimestamp, type Clickhouse, type ProductEventRow } from "@kytelink/clickhouse";
import type Redis from "ioredis";
import type { Logger } from "pino";
import { insertOrBuffer } from "./clickhouse-buffer";
import type { ProductEventInput } from "../seams/analytics-seam";

export interface RecordEventDeps {
  ch: Clickhouse;
  redis: Redis;
  log: Logger;
}

/**
 * The server-side twin of `/t/event`: the same validation, the same row, the
 * same Redis-buffered insert — minus the network hop and minus the chance a
 * visitor closes the tab before the beacon leaves. Milestones that the
 * business counts (a user record existing, a kyte existing) are emitted here
 * rather than from a client, so they cannot be lost or forged.
 */
export async function recordProductEvent(
  deps: RecordEventDeps,
  input: ProductEventInput,
): Promise<void> {
  const schemas: Record<ProductEvent, z.ZodType> = productEventPropsSchemas;
  const parsed = schemas[input.event].safeParse(input.properties ?? {});
  if (!parsed.success) {
    deps.log.warn({ event: input.event }, "dropped a server event — its properties failed validation");
    return;
  }

  const row: ProductEventRow = {
    ts: formatClickhouseTimestamp(new Date()),
    event: input.event,
    user_id: input.userId ?? "",
    kyte_id: input.kyteId ?? "",
    anonymous_id: "",
    properties: JSON.stringify(parsed.data),
  };

  await insertOrBuffer<ProductEventRow>(deps, "product_events", [row], (rows) =>
    deps.ch.insertProductEvents(rows),
  );
}
