import {
  createRawClient,
  formatClickhouseTimestamp,
  readClickhouseConfig,
} from "@kytelink/clickhouse";

export function chTimestamp(date: Date): string {
  return formatClickhouseTimestamp(date);
}

/**
 * Admin analytics reads shapes the platform-wide rollups do not cover (arbitrary
 * instant ranges, unique visitors, bot share), so they run parameterised raw SQL
 * rather than the per-kyte helpers on the Clickhouse interface. Returns [] when
 * the analytics capability is off.
 */
export async function chRows<T>(sql: string, params: Record<string, unknown>): Promise<T[]> {
  const config = readClickhouseConfig();
  if (!config) return [];
  const client = createRawClient(config);
  try {
    const result = await client.query({ query: sql, query_params: params, format: "JSONEachRow" });
    return await result.json<T>();
  } finally {
    await client.close();
  }
}
