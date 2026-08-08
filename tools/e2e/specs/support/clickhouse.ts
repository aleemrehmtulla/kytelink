import { CLICKHOUSE_DB, CLICKHOUSE_PASSWORD, CLICKHOUSE_URL, CLICKHOUSE_USER } from "./urls";

export async function chQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const params = new URLSearchParams({
    database: CLICKHOUSE_DB,
    default_format: "JSONEachRow",
  });
  const res = await fetch(`${CLICKHOUSE_URL}/?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`).toString("base64")}`,
    },
    body: sql,
  });
  if (!res.ok) throw new Error(`clickhouse query failed (${res.status}): ${await res.text()}`);
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export async function chCount(fromWhere: string): Promise<number> {
  const rows = await chQuery<{ c: string }>(`SELECT count() AS c FROM ${fromWhere}`);
  return Number(rows[0]?.c ?? 0);
}

/** Poll until `fromWhere` count exceeds `baseline` (async_insert lags). */
export async function waitForCountAbove(fromWhere: string, baseline: number, { timeoutMs = 25000 } = {}): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let last = baseline;
  while (Date.now() < deadline) {
    last = await chCount(fromWhere);
    if (last > baseline) return last;
    await new Promise((r) => setTimeout(r, 750));
  }
  return last;
}
