import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { readClickhouseConfig, type ClickhouseConfig } from "./config";
import type { LinkHitRow, PageHitRow, ProductEventRow } from "./rows";
import type {
  AnalyticsWindow,
  CountryRow,
  DeviceRow,
  OverviewResult,
  PlatformSeriesPoint,
  PlatformWindow,
  ReferrerRow,
  TimeSeriesPoint,
  TopKyteRow,
  TopKytesArgs,
  TopLinkRow,
} from "./queries";

const ASYNC_INSERT_SETTINGS = {
  async_insert: 1,
  wait_for_async_insert: 0,
} as const;

export interface Clickhouse {
  readonly enabled: boolean;
  insertPageHits(rows: readonly PageHitRow[]): Promise<void>;
  insertLinkHits(rows: readonly LinkHitRow[]): Promise<void>;
  insertProductEvents(rows: readonly ProductEventRow[]): Promise<void>;
  overview(args: AnalyticsWindow): Promise<OverviewResult>;
  timeSeries(args: AnalyticsWindow): Promise<TimeSeriesPoint[]>;
  topLinks(args: AnalyticsWindow): Promise<TopLinkRow[]>;
  referrers(args: AnalyticsWindow): Promise<ReferrerRow[]>;
  devices(args: AnalyticsWindow): Promise<DeviceRow[]>;
  countries(args: AnalyticsWindow): Promise<CountryRow[]>;
  platformSeries(args: PlatformWindow): Promise<PlatformSeriesPoint[]>;
  topKytes(args: TopKytesArgs): Promise<TopKyteRow[]>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

const EMPTY_OVERVIEW: OverviewResult = { totalViews: 0, totalClicks: 0 };

// When CLICKHOUSE_URL is unset the analytics capability is off (25-selfhost.md):
// inserts drop, queries return empty, nothing ever throws.
class NoopClickhouse implements Clickhouse {
  readonly enabled = false;
  async insertPageHits(): Promise<void> {}
  async insertLinkHits(): Promise<void> {}
  async insertProductEvents(): Promise<void> {}
  async overview(): Promise<OverviewResult> {
    return EMPTY_OVERVIEW;
  }
  async timeSeries(): Promise<TimeSeriesPoint[]> {
    return [];
  }
  async topLinks(): Promise<TopLinkRow[]> {
    return [];
  }
  async referrers(): Promise<ReferrerRow[]> {
    return [];
  }
  async devices(): Promise<DeviceRow[]> {
    return [];
  }
  async countries(): Promise<CountryRow[]> {
    return [];
  }
  async platformSeries(): Promise<PlatformSeriesPoint[]> {
    return [];
  }
  async topKytes(): Promise<TopKyteRow[]> {
    return [];
  }
  async ping(): Promise<boolean> {
    return false;
  }
  async close(): Promise<void> {}
}

const MAX_WINDOW_DAYS = 90;
const TOP_LINKS_LIMIT = 50;
const TOP_REFERRERS_LIMIT = 8;

function clampDays(days: number): number {
  return Math.min(Math.max(1, Math.trunc(days)), MAX_WINDOW_DAYS);
}

// Query bodies read rollup MVs only (page_hits_daily / link_hits_daily /
// referrers_daily / countries_daily / devices_daily / platform_daily) —
// never the raw event tables — per doc 07.
class LiveClickhouse implements Clickhouse {
  readonly enabled = true;
  private readonly client: ClickHouseClient;

  constructor(config: ClickhouseConfig) {
    this.client = createClient({
      url: config.url,
      username: config.username,
      password: config.password,
      database: config.database,
    });
  }

  private async insert<T>(table: string, rows: readonly T[]): Promise<void> {
    if (rows.length === 0) return;
    await this.client.insert({
      table,
      values: rows,
      format: "JSONEachRow",
      clickhouse_settings: ASYNC_INSERT_SETTINGS,
    });
  }

  async insertPageHits(rows: readonly PageHitRow[]): Promise<void> {
    await this.insert("page_hits", rows);
  }
  async insertLinkHits(rows: readonly LinkHitRow[]): Promise<void> {
    await this.insert("link_hits", rows);
  }
  async insertProductEvents(rows: readonly ProductEventRow[]): Promise<void> {
    await this.insert("product_events", rows);
  }

  private async selectRows<T>(query: string, query_params: Record<string, unknown>): Promise<T[]> {
    const result = await this.client.query({ query, query_params, format: "JSONEachRow" });
    return result.json<T>();
  }

  async overview(args: AnalyticsWindow): Promise<OverviewResult> {
    const rows = await this.selectRows<{ views: string; clicks: string }>(
      `SELECT
         (SELECT coalesce(sum(views), 0) FROM page_hits_daily WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}) AS views,
         (SELECT coalesce(sum(clicks), 0) FROM link_hits_daily WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}) AS clicks`,
      { kyteId: args.kyteId, days: clampDays(args.days) },
    );
    const row = rows[0];
    if (!row) return EMPTY_OVERVIEW;
    return { totalViews: Number(row.views), totalClicks: Number(row.clicks) };
  }

  async timeSeries(args: AnalyticsWindow): Promise<TimeSeriesPoint[]> {
    const rows = await this.selectRows<{ date: string; views: string }>(
      `SELECT date, sum(views) AS views
       FROM page_hits_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}
       GROUP BY date
       ORDER BY date`,
      { kyteId: args.kyteId, days: clampDays(args.days) },
    );
    return rows.map((row) => ({ date: row.date, views: Number(row.views) }));
  }

  async topLinks(args: AnalyticsWindow): Promise<TopLinkRow[]> {
    const rows = await this.selectRows<{ link_url: string; link_title: string; clicks: string }>(
      `SELECT link_url, any(link_title) AS link_title, sum(clicks) AS clicks
       FROM link_hits_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}
       GROUP BY link_url
       ORDER BY clicks DESC
       LIMIT {limit:UInt16}`,
      { kyteId: args.kyteId, days: clampDays(args.days), limit: TOP_LINKS_LIMIT },
    );
    return rows.map((row) => ({
      linkUrl: row.link_url,
      linkTitle: row.link_title,
      clicks: Number(row.clicks),
    }));
  }

  async referrers(args: AnalyticsWindow): Promise<ReferrerRow[]> {
    const rows = await this.selectRows<{ ref_domain: string; views: string }>(
      `SELECT ref_domain, sum(views) AS views
       FROM referrers_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}
       GROUP BY ref_domain
       ORDER BY views DESC
       LIMIT {limit:UInt16}`,
      { kyteId: args.kyteId, days: clampDays(args.days), limit: TOP_REFERRERS_LIMIT },
    );
    return rows.map((row) => ({ refDomain: row.ref_domain, views: Number(row.views) }));
  }

  async devices(args: AnalyticsWindow): Promise<DeviceRow[]> {
    const rows = await this.selectRows<{ device: string; views: string }>(
      `SELECT device, sum(views) AS views
       FROM devices_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}
       GROUP BY device
       ORDER BY views DESC`,
      { kyteId: args.kyteId, days: clampDays(args.days) },
    );
    return rows.map((row) => ({ device: row.device as DeviceRow["device"], views: Number(row.views) }));
  }

  async countries(args: AnalyticsWindow): Promise<CountryRow[]> {
    const rows = await this.selectRows<{ country: string; views: string }>(
      `SELECT country, sum(views) AS views
       FROM countries_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - {days:UInt16}
       GROUP BY country
       ORDER BY views DESC`,
      { kyteId: args.kyteId, days: clampDays(args.days) },
    );
    return rows.map((row) => ({ country: row.country, views: Number(row.views) }));
  }

  async platformSeries(args: PlatformWindow): Promise<PlatformSeriesPoint[]> {
    const rows = await this.selectRows<{ date: string; views: string; clicks: string; uniqKytes: string }>(
      `SELECT date, sum(views) AS views, sum(clicks) AS clicks, uniqMerge(uniq_kytes) AS uniqKytes
       FROM platform_daily
       WHERE date >= today() - {days:UInt16}
       GROUP BY date
       ORDER BY date`,
      { days: clampDays(args.days) },
    );
    return rows.map((row) => ({
      date: row.date,
      views: Number(row.views),
      clicks: Number(row.clicks),
      uniqKytes: Number(row.uniqKytes),
    }));
  }

  async topKytes(args: TopKytesArgs): Promise<TopKyteRow[]> {
    const rows = await this.selectRows<{ kyte_id: string; views: string }>(
      `SELECT kyte_id, sum(views) AS views
       FROM page_hits_daily
       WHERE date >= today() - {days:UInt16}
       GROUP BY kyte_id
       ORDER BY views DESC
       LIMIT {limit:UInt16}`,
      { days: clampDays(args.days), limit: Math.max(1, Math.trunc(args.limit)) },
    );
    return rows.map((row) => ({ kyteId: row.kyte_id, views: Number(row.views) }));
  }

  async ping(): Promise<boolean> {
    const result = await this.client.ping();
    return result.success;
  }
  async close(): Promise<void> {
    await this.client.close();
  }

  get raw(): ClickHouseClient {
    return this.client;
  }
}

export function createClickhouse(config: ClickhouseConfig | null): Clickhouse {
  return config ? new LiveClickhouse(config) : new NoopClickhouse();
}

let singleton: Clickhouse | undefined;

export function getClickhouse(env?: NodeJS.ProcessEnv): Clickhouse {
  singleton ??= createClickhouse(readClickhouseConfig(env));
  return singleton;
}

export function resetClickhouse(): void {
  singleton = undefined;
}

export function createRawClient(config: ClickhouseConfig): ClickHouseClient {
  return createClient({
    url: config.url,
    username: config.username,
    password: config.password,
    database: config.database,
  });
}
