import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@kytelink/db";
import type { DeviceType } from "@kytelink/schemas";
import { chRows, chTimestamp } from "./clickhouse-raw";

export type Granularity = "hour" | "day" | "week";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

// A chart with more points than this is unreadable and the query that builds it
// is needlessly expensive, so the resolver coarsens instead and reports back the
// granularity it actually used.
const MAX_BUCKETS = 750;
const MAX_RANGE_MS = 730 * DAY_MS;

const BUCKET_MS: Record<Granularity, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
  week: WEEK_MS,
};

// Every bucket expression is pinned to UTC so a non-UTC ClickHouse server cannot
// shift day boundaries away from the ISO instants the client sent.
const BUCKET_EXPR: Record<Granularity, string> = {
  hour: "toStartOfHour(ts, 'UTC')",
  day: "toDate(ts, 'UTC')",
  week: "toMonday(ts, 'UTC')",
};

export interface TrafficRange {
  from: Date;
  to: Date;
  granularity: Granularity;
}

function parseInstant(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${field} is not a valid ISO instant.` });
  }
  return parsed;
}

export function resolveRange(input: {
  from: string;
  to: string;
  granularity: Granularity;
}): TrafficRange {
  const from = parseInstant(input.from, "from");
  const to = parseInstant(input.to, "to");
  if (to.getTime() <= from.getTime()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "`to` must be after `from`." });
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Range must span 730 days or less." });
  }
  return { from, to, granularity: coarsen(from, to, input.granularity) };
}

function coarsen(from: Date, to: Date, requested: Granularity): Granularity {
  const span = to.getTime() - from.getTime();
  const order: Granularity[] = ["hour", "day", "week"];
  let index = order.indexOf(requested);
  while (index < order.length - 1 && span / BUCKET_MS[order[index] as Granularity] > MAX_BUCKETS) {
    index += 1;
  }
  return order[index] as Granularity;
}

function bucketStart(instant: Date, granularity: Granularity): Date {
  const date = new Date(instant);
  if (granularity === "hour") {
    date.setUTCMinutes(0, 0, 0);
    return date;
  }
  date.setUTCHours(0, 0, 0, 0);
  if (granularity === "week") {
    // ISO weeks start Monday, matching ClickHouse toMonday.
    const shift = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - shift);
  }
  return date;
}

function bucketKeys(range: TrafficRange): string[] {
  const keys: string[] = [];
  const cursor = bucketStart(range.from, range.granularity);
  const end = range.to.getTime();
  while (cursor.getTime() < end) {
    keys.push(isoBucket(cursor));
    if (range.granularity === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else if (range.granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return keys;
}

function isoBucket(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

const BUCKET_FORMAT = "'%Y-%m-%dT%H:%M:%SZ', 'UTC'";

interface BucketRow {
  bucket: string;
  a: string;
  b: string;
}

interface WindowRow {
  views: string;
  bot_views: string;
  visitors: string;
  prev_views: string;
  prev_visitors: string;
}

interface ClickWindowRow {
  clicks: string;
  prev_clicks: string;
}

export interface TrafficSeriesResult {
  granularity: Granularity;
  points: { bucket: string; views: number; clicks: number; visitors: number }[];
  totals: { views: number; clicks: number; visitors: number; ctrPct: number; botPct: number };
  previousTotals: { views: number; clicks: number; visitors: number };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function trafficSeries(range: TrafficRange): Promise<TrafficSeriesResult> {
  const span = range.to.getTime() - range.from.getTime();
  const params = {
    from: chTimestamp(range.from),
    to: chTimestamp(range.to),
    prevFrom: chTimestamp(new Date(range.from.getTime() - span)),
  };
  const bucket = BUCKET_EXPR[range.granularity];

  const [viewRows, clickRows, windowRows, clickWindowRows] = await Promise.all([
    chRows<BucketRow>(
      `SELECT formatDateTime(${bucket}, ${BUCKET_FORMAT}) AS bucket,
              countIf(is_bot = 0) AS a,
              uniqExactIf(ip_hash, is_bot = 0) AS b
       FROM page_hits
       WHERE ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}
       GROUP BY bucket ORDER BY bucket`,
      params,
    ),
    chRows<BucketRow>(
      `SELECT formatDateTime(${bucket}, ${BUCKET_FORMAT}) AS bucket,
              count() AS a, toUInt64(0) AS b
       FROM link_hits
       WHERE is_bot = 0 AND ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}
       GROUP BY bucket ORDER BY bucket`,
      params,
    ),
    // Current and previous window in one pass: the period-over-period delta must
    // never cost a second full scan of page_hits.
    chRows<WindowRow>(
      `SELECT countIf(is_bot = 0 AND ts >= {from:DateTime64(3)}) AS views,
              countIf(is_bot = 1 AND ts >= {from:DateTime64(3)}) AS bot_views,
              uniqExactIf(ip_hash, is_bot = 0 AND ts >= {from:DateTime64(3)}) AS visitors,
              countIf(is_bot = 0 AND ts < {from:DateTime64(3)}) AS prev_views,
              uniqExactIf(ip_hash, is_bot = 0 AND ts < {from:DateTime64(3)}) AS prev_visitors
       FROM page_hits
       WHERE ts >= {prevFrom:DateTime64(3)} AND ts < {to:DateTime64(3)}`,
      params,
    ),
    chRows<ClickWindowRow>(
      `SELECT countIf(ts >= {from:DateTime64(3)}) AS clicks,
              countIf(ts < {from:DateTime64(3)}) AS prev_clicks
       FROM link_hits
       WHERE is_bot = 0 AND ts >= {prevFrom:DateTime64(3)} AND ts < {to:DateTime64(3)}`,
      params,
    ),
  ]);

  const views = new Map(viewRows.map((row) => [row.bucket, Number(row.a)]));
  const visitors = new Map(viewRows.map((row) => [row.bucket, Number(row.b)]));
  const clicks = new Map(clickRows.map((row) => [row.bucket, Number(row.a)]));

  const points = bucketKeys(range).map((key) => ({
    bucket: key,
    views: views.get(key) ?? 0,
    clicks: clicks.get(key) ?? 0,
    visitors: visitors.get(key) ?? 0,
  }));

  const window = windowRows[0];
  const clickWindow = clickWindowRows[0];
  const totalViews = Number(window?.views ?? 0);
  const botViews = Number(window?.bot_views ?? 0);
  const totalClicks = Number(clickWindow?.clicks ?? 0);

  return {
    granularity: range.granularity,
    points,
    totals: {
      views: totalViews,
      clicks: totalClicks,
      visitors: Number(window?.visitors ?? 0),
      ctrPct: pct(totalClicks, totalViews),
      botPct: pct(botViews, totalViews + botViews),
    },
    previousTotals: {
      views: Number(window?.prev_views ?? 0),
      clicks: Number(clickWindow?.prev_clicks ?? 0),
      visitors: Number(window?.prev_visitors ?? 0),
    },
  };
}

export interface TopKyteRow {
  kyteId: string;
  orgId: string;
  username: string | null;
  displayName: string | null;
  views: number;
  clicks: number;
}

export async function topKytes(
  db: PrismaClient,
  range: TrafficRange,
  limit: number,
): Promise<TopKyteRow[]> {
  const params = {
    from: chTimestamp(range.from),
    to: chTimestamp(range.to),
    limit,
  };
  const viewRows = await chRows<{ kyte_id: string; views: string }>(
    `SELECT kyte_id, count() AS views FROM page_hits
     WHERE is_bot = 0 AND ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}
     GROUP BY kyte_id ORDER BY views DESC LIMIT {limit:UInt16}`,
    params,
  );
  if (viewRows.length === 0) return [];
  const kyteIds = viewRows.map((row) => row.kyte_id);

  const [clickRows, kytes] = await Promise.all([
    chRows<{ kyte_id: string; clicks: string }>(
      `SELECT kyte_id, count() AS clicks FROM link_hits
       WHERE is_bot = 0 AND ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}
         AND kyte_id IN {kyteIds:Array(String)}
       GROUP BY kyte_id`,
      { ...params, kyteIds },
    ),
    // One Postgres round trip resolves every id: the old resolver handed the UI
    // bare cuids as chart labels.
    db.kyte.findMany({
      where: { id: { in: kyteIds } },
      select: { id: true, orgId: true, username: true, displayName: true },
    }),
  ]);

  const clicks = new Map(clickRows.map((row) => [row.kyte_id, Number(row.clicks)]));
  const meta = new Map(kytes.map((kyte) => [kyte.id, kyte]));

  return viewRows.map((row) => {
    const kyte = meta.get(row.kyte_id);
    return {
      kyteId: row.kyte_id,
      orgId: kyte?.orgId ?? "",
      username: kyte?.username ?? null,
      displayName: kyte?.displayName ?? null,
      views: Number(row.views),
      clicks: clicks.get(row.kyte_id) ?? 0,
    };
  });
}

export interface TrafficBreakdownResult {
  referrers: { refDomain: string; views: number }[];
  countries: { country: string; views: number }[];
  devices: { device: DeviceType; views: number }[];
  hourOfDay: { hour: number; views: number }[];
}

export async function trafficBreakdown(range: TrafficRange): Promise<TrafficBreakdownResult> {
  const params = { from: chTimestamp(range.from), to: chTimestamp(range.to) };
  const window = `is_bot = 0 AND ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}`;

  const [refRows, countryRows, deviceRows, hourRows] = await Promise.all([
    chRows<{ k: string; views: string }>(
      `SELECT ref_domain AS k, count() AS views FROM page_hits WHERE ${window}
       GROUP BY k ORDER BY views DESC LIMIT 20`,
      params,
    ),
    chRows<{ k: string; views: string }>(
      `SELECT country AS k, count() AS views FROM page_hits WHERE ${window}
       GROUP BY k ORDER BY views DESC LIMIT 20`,
      params,
    ),
    chRows<{ k: string; views: string }>(
      `SELECT device AS k, count() AS views FROM page_hits WHERE ${window}
       GROUP BY k ORDER BY views DESC`,
      params,
    ),
    chRows<{ k: number; views: string }>(
      `SELECT toHour(ts, 'UTC') AS k, count() AS views FROM page_hits WHERE ${window}
       GROUP BY k ORDER BY k`,
      params,
    ),
  ]);

  const hours = new Map(hourRows.map((row) => [Number(row.k), Number(row.views)]));

  return {
    referrers: refRows.map((row) => ({ refDomain: row.k || "(direct)", views: Number(row.views) })),
    countries: countryRows.map((row) => ({ country: row.k || "??", views: Number(row.views) })),
    devices: deviceRows.map((row) => ({
      device: row.k as DeviceType,
      views: Number(row.views),
    })),
    hourOfDay: Array.from({ length: 24 }, (_, hour) => ({ hour, views: hours.get(hour) ?? 0 })),
  };
}
