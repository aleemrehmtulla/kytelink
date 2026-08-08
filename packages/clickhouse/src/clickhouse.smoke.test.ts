import { afterEach, describe, expect, it } from "vitest";
import {
  createClickhouse,
  formatClickhouseTimestamp,
  getClickhouse,
  readClickhouseConfig,
  resetClickhouse,
} from "./index";

afterEach(() => {
  resetClickhouse();
});

describe("packages/clickhouse smoke", () => {
  it("reads null config when CLICKHOUSE_URL is unset", () => {
    expect(readClickhouseConfig({})).toBeNull();
  });

  it("degrades to a no-op client with the analytics capability off", async () => {
    const ch = createClickhouse(null);
    expect(ch.enabled).toBe(false);
    await expect(ch.insertPageHits([])).resolves.toBeUndefined();
    await expect(ch.overview({ kyteId: "k", days: 30 })).resolves.toEqual({
      totalViews: 0,
      totalClicks: 0,
    });
    await expect(ch.timeSeries({ kyteId: "k", days: 30 })).resolves.toEqual([]);
    await expect(ch.ping()).resolves.toBe(false);
  });

  it("returns a live client when a config is present", () => {
    const ch = createClickhouse({
      url: "http://localhost:8123",
      username: "default",
      password: "",
      database: "default",
    });
    expect(ch.enabled).toBe(true);
  });

  it("resolves a config from env", () => {
    const config = readClickhouseConfig({ CLICKHOUSE_URL: "http://localhost:8123" });
    expect(config).toEqual({
      url: "http://localhost:8123",
      username: "default",
      password: "",
      database: "default",
    });
  });

  it("getClickhouse degrades to no-op without env", () => {
    expect(getClickhouse({} as NodeJS.ProcessEnv).enabled).toBe(false);
  });

  it("formats a clickhouse DateTime64(3) timestamp", () => {
    expect(formatClickhouseTimestamp(new Date("2026-07-18T12:34:56.789Z"))).toBe(
      "2026-07-18 12:34:56.789",
    );
  });
});
