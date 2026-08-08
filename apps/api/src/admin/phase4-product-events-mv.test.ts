import { afterAll, describe, expect, it } from "vitest";
import { createRawClient, readClickhouseConfig } from "@kytelink/clickhouse";

const config = readClickhouseConfig();
const TEST_DATE = "2019-05-15";
const TEST_TS = `${TEST_DATE} 12:00:00`;

describe.skipIf(!config)("product_events_daily rollup matches raw (H10)", () => {
  afterAll(async () => {
    if (!config) return;
    const client = createRawClient(config);
    try {
      await client.command({
        query: `ALTER TABLE product_events DELETE WHERE toDate(ts) = {d:Date}`,
        query_params: { d: TEST_DATE },
      });
      await client.command({
        query: `ALTER TABLE product_events_daily DELETE WHERE date = {d:Date}`,
        query_params: { d: TEST_DATE },
      });
    } finally {
      await client.close();
    }
  });

  it("uniqExactMerge(uniq_users) equals raw uniqExact(user_id) for the day", async () => {
    if (!config) return;
    const client = createRawClient(config);
    try {
      const rows = [
        { ts: TEST_TS, event: "signup_completed", user_id: "mvu1", kyte_id: "k1", anonymous_id: "a", properties: "{}" },
        { ts: TEST_TS, event: "page_viewed", user_id: "mvu1", kyte_id: "k1", anonymous_id: "a", properties: "{}" },
        { ts: TEST_TS, event: "page_viewed", user_id: "mvu2", kyte_id: "k2", anonymous_id: "a", properties: "{}" },
        { ts: TEST_TS, event: "page_viewed", user_id: "mvu3", kyte_id: "k3", anonymous_id: "a", properties: "{}" },
        { ts: TEST_TS, event: "page_viewed", user_id: "", kyte_id: "k4", anonymous_id: "a", properties: "{}" },
      ];
      await client.insert({ table: "product_events", values: rows, format: "JSONEachRow" });

      const rawResult = await client.query({
        query: `SELECT uniqExact(user_id) AS c FROM product_events WHERE toDate(ts) = {d:Date} AND user_id != ''`,
        query_params: { d: TEST_DATE },
        format: "JSONEachRow",
      });
      const raw = Number((await rawResult.json<{ c: string }>())[0]?.c ?? 0);

      const mvResult = await client.query({
        query: `SELECT uniqExactMerge(uniq_users) AS c FROM product_events_daily WHERE date = {d:Date}`,
        query_params: { d: TEST_DATE },
        format: "JSONEachRow",
      });
      const mv = Number((await mvResult.json<{ c: string }>())[0]?.c ?? 0);

      expect(raw).toBe(3);
      expect(mv).toBe(raw);
    } finally {
      await client.close();
    }
  });
});
