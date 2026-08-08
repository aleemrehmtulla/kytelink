import { Prisma, type PrismaClient } from "@kytelink/db";
import type { Capabilities } from "@kytelink/schemas";
import { withQueryCache } from "../analytics/query-cache";
import { getRedis } from "../redis";
import { chRows, chTimestamp } from "./clickhouse-raw";
import { num } from "./admin-sql";

const GROWTH_TTL_SEC = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const LANDING_PATH_LIMIT = 12;
const ACTIVATION_THRESHOLD = 10;

/**
 * Activation is measured per kyte in memory, so the cohort has a ceiling.
 * Above it the sample is the most recently created kytes and the output says
 * it was capped rather than quietly under-reporting.
 */
const ACTIVATION_COHORT_CAP = 20_000;

/** Guard on the ClickHouse side of the same join, ordered so the tail is what falls off. */
const ENGAGED_ROW_CAP = 200_000;

export type GrowthDays = 7 | 30 | 90;

type FunnelKey = "landing_views" | "get_started_clicks" | "signups" | "onboarded" | "launched";

export interface GrowthFunnelStep {
  key: FunnelKey;
  count: number | null;
  unit: "views" | "clicks" | "users" | "kytes";
  source: "clickhouse" | "postgres";
  ratePct: number | null;
  ofKey: FunnelKey | null;
}

export interface GrowthStats {
  days: number;
  since: string;
  analytics: boolean;
  funnel: GrowthFunnelStep[];
  landingPages: { path: string; views: number; sharePct: number }[];
  landingPathsSince: string | null;
  getStartedSurfaces: { surface: string; clicks: number; sharePct: number }[];
  activation: {
    cohortKytes: number;
    measuredKytes: number;
    capped: boolean;
    launched: number;
    launchedPct: number;
    withTenClicks: number | null;
    withTenClicksPct: number | null;
    withTenViews: number | null;
    withTenViewsPct: number | null;
    medianClicks: number | null;
  };
  series: { date: string; signups: number; kytesCreated: number; launched: number }[];
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function ratePct(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function growth(
  db: PrismaClient,
  capabilities: Capabilities,
  days: GrowthDays,
): Promise<GrowthStats> {
  return withQueryCache(
    getRedis(),
    // The capability is part of the key: half this payload is null without it,
    // and a cached analytics-off answer must never be served to an analytics-on
    // process (they share one Redis).
    `admin:growth:${days}:${capabilities.analytics ? "ch" : "pg"}`,
    () => computeGrowth(db, capabilities, days),
    GROWTH_TTL_SEC,
  );
}

interface EventCounts {
  landingViews: number;
  getStartedClicks: number;
  onboarded: number;
}

async function eventCounts(from: Date): Promise<EventCounts> {
  const params = { from: chTimestamp(from) };
  const [landing, getStarted, onboarded] = await Promise.all([
    chRows<{ c: string }>(
      `SELECT count() AS c FROM product_events
       WHERE event = 'hit_landing' AND ts >= {from:DateTime64(3)}`,
      params,
    ),
    chRows<{ c: string }>(
      `SELECT count() AS c FROM product_events
       WHERE event = 'clicked_get_started' AND ts >= {from:DateTime64(3)}`,
      params,
    ),
    // Either milestone counts as "made it through onboarding": a user who
    // skipped the link step still published, and one who published from the
    // editor never fired step 4.
    chRows<{ c: string }>(
      `SELECT uniqExact(user_id) AS c FROM product_events
       WHERE event IN ('profile_published', 'onboarding_step_4')
         AND user_id != '' AND ts >= {from:DateTime64(3)}`,
      params,
    ),
  ]);
  return {
    landingViews: num(landing[0]?.c),
    getStartedClicks: num(getStarted[0]?.c),
    onboarded: num(onboarded[0]?.c),
  };
}

async function landingPaths(
  from: Date,
): Promise<{ rows: { path: string; views: number; sharePct: number }[]; since: string | null }> {
  const [rows, firstSeen] = await Promise.all([
    chRows<{ path: string; views: string }>(
      `SELECT JSONExtractString(properties, 'path') AS path, count() AS views
       FROM product_events
       WHERE event = 'hit_landing' AND ts >= {from:DateTime64(3)}
         AND JSONExtractString(properties, 'path') != ''
       GROUP BY path ORDER BY views DESC LIMIT {limit:UInt8}`,
      { from: chTimestamp(from), limit: LANDING_PATH_LIMIT },
    ),
    // `path` only exists on events emitted after it shipped, so the UI has to
    // be able to say "collecting since ..." instead of implying zero traffic.
    chRows<{ since: string }>(
      `SELECT min(ts) AS since FROM product_events
       WHERE event = 'hit_landing' AND JSONExtractString(properties, 'path') != ''`,
      {},
    ),
  ]);

  const total = rows.reduce((acc, row) => acc + num(row.views), 0);
  const since = firstSeen[0]?.since;
  return {
    rows: rows.map((row) => ({
      path: row.path,
      views: num(row.views),
      sharePct: pct(num(row.views), total),
    })),
    // An empty aggregate yields ClickHouse's zero date rather than no row.
    since: since && !since.startsWith("1970-01-01") ? chTimestampToIso(since) : null,
  };
}

/** ClickHouse hands back "YYYY-MM-DD hh:mm:ss.SSS" in UTC with no marker. */
function chTimestampToIso(value: string): string {
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function getStartedSurfaces(
  from: Date,
): Promise<{ surface: string; clicks: number; sharePct: number }[]> {
  const rows = await chRows<{ surface: string; clicks: string }>(
    `SELECT JSONExtractString(properties, 'surface') AS surface, count() AS clicks
     FROM product_events
     WHERE event = 'clicked_get_started' AND ts >= {from:DateTime64(3)}
     GROUP BY surface ORDER BY clicks DESC`,
    { from: chTimestamp(from) },
  );
  const total = rows.reduce((acc, row) => acc + num(row.clicks), 0);
  return rows.map((row) => ({
    surface: row.surface,
    clicks: num(row.clicks),
    sharePct: pct(num(row.clicks), total),
  }));
}

/**
 * Asks ClickHouse which kytes moved rather than asking about the cohort's
 * ids: a cohort of several thousand 40-character ids does not fit in a
 * ClickHouse `IN` parameter (they travel in the request URL, which the server
 * rejects as an over-long form field). Kytes with traffic are a small fraction
 * of kytes that exist, so the intersection happens here instead.
 *
 * Clicks come back from one click up because the median needs the real
 * distribution; views come back only at the threshold, because that is the
 * only question asked of them.
 */
async function engagedKytes(
  from: Date,
): Promise<{ clicks: Map<string, number>; tenViews: Set<string> }> {
  const params = { since: ymd(from), threshold: ACTIVATION_THRESHOLD, limit: ENGAGED_ROW_CAP };
  const [clickRows, viewRows] = await Promise.all([
    chRows<{ kyte_id: string; c: string }>(
      `SELECT kyte_id, sum(clicks) AS c FROM link_hits_daily
       WHERE date >= {since:Date}
       GROUP BY kyte_id HAVING c > 0
       ORDER BY c DESC LIMIT {limit:UInt32}`,
      params,
    ),
    chRows<{ kyte_id: string }>(
      `SELECT kyte_id FROM page_hits_daily
       WHERE date >= {since:Date}
       GROUP BY kyte_id HAVING sum(views) >= {threshold:UInt32}
       ORDER BY sum(views) DESC LIMIT {limit:UInt32}`,
      params,
    ),
  ]);
  return {
    clicks: new Map(clickRows.map((row) => [row.kyte_id, num(row.c)])),
    tenViews: new Set(viewRows.map((row) => row.kyte_id)),
  };
}

async function computeGrowth(
  db: PrismaClient,
  capabilities: Capabilities,
  days: GrowthDays,
): Promise<GrowthStats> {
  const now = Date.now();
  const from = new Date(now - days * DAY_MS);

  const [signups, cohortKytes, cohort, launched, dayRows, signupRows] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: from } } }),
    db.kyte.count({ where: { createdAt: { gte: from } } }),
    db.kyte.findMany({
      where: { createdAt: { gte: from } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: ACTIVATION_COHORT_CAP,
    }),
    db.publishedKyte.count({ where: { kyte: { createdAt: { gte: from } } } }),
    // "Launched" is dated by when the kyte was CREATED, not by publishedAt —
    // that column is @updatedAt, so it moves on every republish and a daily
    // count of it measures editing activity rather than launches.
    db.$queryRaw<{ date: string; created: number; launched: number }[]>(Prisma.sql`
      SELECT to_char((k."createdAt" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
             count(*)::int AS created,
             count(p."kyteId")::int AS launched
      FROM "Kyte" k LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      WHERE k."createdAt" >= ${from}
      GROUP BY 1 ORDER BY 1
    `),
    db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
             count(*)::int AS count
      FROM "User" WHERE "createdAt" >= ${from}
      GROUP BY 1 ORDER BY 1
    `),
  ]);

  const cohortIds = cohort.map((kyte) => kyte.id);
  const analytics = capabilities.analytics;

  const [events, paths, surfaces, engagement] = analytics
    ? await Promise.all([
        eventCounts(from),
        landingPaths(from),
        getStartedSurfaces(from),
        engagedKytes(from),
      ])
    : [null, null, null, null];

  const landingViews = events ? events.landingViews : null;
  const getStartedClicks = events ? events.getStartedClicks : null;
  const onboarded = events ? events.onboarded : null;

  const funnel: GrowthFunnelStep[] = [
    {
      key: "landing_views",
      count: landingViews,
      unit: "views",
      source: "clickhouse",
      ratePct: null,
      ofKey: null,
    },
    {
      key: "get_started_clicks",
      count: getStartedClicks,
      unit: "clicks",
      source: "clickhouse",
      ratePct: ratePct(getStartedClicks, landingViews),
      ofKey: "landing_views",
    },
    {
      key: "signups",
      count: signups,
      unit: "users",
      source: "postgres",
      ratePct: ratePct(signups, getStartedClicks),
      ofKey: "get_started_clicks",
    },
    {
      key: "onboarded",
      count: onboarded,
      unit: "users",
      source: "clickhouse",
      ratePct: ratePct(onboarded, signups),
      ofKey: "signups",
    },
    // Deliberately measured against signups rather than the step before it:
    // "how many people who sign up actually launch" is the question, and it
    // must survive a deployment where the ClickHouse step above is null.
    {
      key: "launched",
      count: launched,
      unit: "kytes",
      source: "postgres",
      ratePct: ratePct(launched, signups),
      ofKey: "signups",
    },
  ];

  const clickCounts = cohortIds.map((id) => engagement?.clicks.get(id) ?? 0);
  const withTenClicks = engagement
    ? clickCounts.filter((count) => count >= ACTIVATION_THRESHOLD).length
    : null;
  const withTenViews = engagement
    ? cohortIds.filter((id) => engagement.tenViews.has(id)).length
    : null;

  const dayCounts = new Map(dayRows.map((row) => [row.date, row]));
  const signupCounts = new Map(signupRows.map((row) => [row.date, num(row.count)]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = ymd(new Date(now - (days - 1 - index) * DAY_MS));
    const row = dayCounts.get(date);
    return {
      date,
      signups: signupCounts.get(date) ?? 0,
      kytesCreated: num(row?.created),
      launched: num(row?.launched),
    };
  });

  return {
    days,
    since: from.toISOString(),
    analytics,
    funnel,
    landingPages: paths ? paths.rows : [],
    landingPathsSince: paths ? paths.since : null,
    getStartedSurfaces: surfaces ?? [],
    activation: {
      cohortKytes,
      measuredKytes: cohortIds.length,
      capped: cohortKytes > cohortIds.length,
      launched,
      launchedPct: pct(launched, cohortKytes),
      withTenClicks,
      withTenClicksPct: withTenClicks === null ? null : pct(withTenClicks, cohortIds.length),
      withTenViews,
      withTenViewsPct: withTenViews === null ? null : pct(withTenViews, cohortIds.length),
      medianClicks: engagement ? median(clickCounts) : null,
    },
    series,
  };
}
