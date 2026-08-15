import { describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { computeCapabilities } from "@kytelink/schemas";
import { EXPORT_DATASETS } from "@kytelink/trpc";
import { exportRows } from "./admin-exports";
import * as queries from "./admin-queries";
import { growth } from "./growth-queries";
import * as storage from "./storage-queries";
import { resolveRange, topKytes, trafficBreakdown, trafficSeries } from "./traffic-queries";

const hasDb = Boolean(process.env.DATABASE_URL);
const hasCh = Boolean(process.env.CLICKHOUSE_URL);

const PAGE = { page: 1, pageSize: 25 };
const RANGE = {
  from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString(),
  granularity: "day" as const,
};

/**
 * Raw SQL only fails at execution time, so every hand-written query runs here
 * against the real schema. Assertions are deliberately shallow — this is a
 * "does the SQL parse and bind" gate, not a data-correctness suite.
 */
describe.skipIf(!hasDb)("every admin query executes against the real schema", () => {
  it("runs the paginated list resolvers", async () => {
    const db = getDb();

    const users = await queries.searchUsers(db, {
      query: "",
      sort: "storageBytes",
      dir: "desc",
      ...PAGE,
    });
    expect(users.total).toBeGreaterThanOrEqual(users.rows.length);

    const orgs = await queries.searchOrgs(db, {
      query: "",
      sort: "storageBytes",
      dir: "desc",
      ...PAGE,
    });
    expect(orgs.total).toBeGreaterThanOrEqual(orgs.rows.length);

    const suspended = await queries.suspendedList(db, {
      search: "",
      signals: ["sus_links", "nsfw"],
      source: "auto",
      sort: "confidence",
      dir: "desc",
      ...PAGE,
    });
    expect(Array.isArray(suspended.rows)).toBe(true);

    const reports = await queries.abuseReports(
      db,
      { search: "", sort: "reportCountForKyte", dir: "desc", ...PAGE },
      "http://localhost:3000",
    );
    expect(Array.isArray(reports.rows)).toBe(true);

    const audit = await queries.auditLog(db, {
      actorEmail: "kytelink",
      search: "a",
      scope: "admin",
      from: new Date(0).toISOString(),
      to: new Date().toISOString(),
      ...PAGE,
    });
    expect(Array.isArray(audit.rows)).toBe(true);

    const alerts = await queries.alerts(db, { status: "all", ...PAGE });
    expect(alerts.counts.unresolved + alerts.counts.resolved).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(alerts.kinds)).toBe(true);
  });

  it("runs every sort key of every sortable list", async () => {
    const db = getDb();
    for (const sort of ["createdAt", "email", "name", "storageBytes", "orgCount"] as const) {
      for (const dir of ["asc", "desc"] as const) {
        await queries.searchUsers(db, { query: "", sort, dir, ...PAGE });
      }
    }
    for (const sort of ["createdAt", "name", "storageBytes", "kyteCount", "memberCount"] as const) {
      await queries.searchOrgs(db, { query: "", sort, dir: "asc", ...PAGE });
    }
    for (const sort of ["suspendedAt", "username", "confidence"] as const) {
      await queries.suspendedList(db, { search: "", sort, dir: "asc", ...PAGE });
    }
    for (const sort of ["bytes", "assetCount", "pctOfLimit", "orgName"] as const) {
      await storage.storageOrgs(db, { query: "", sort, dir: "asc", overLimitOnly: false, ...PAGE });
    }
    expect(true).toBe(true);
  });

  it("runs the storage resolvers including the over-limit filter", async () => {
    const db = getDb();
    const overview = await storage.storageOverview(db);
    expect(overview.growthSeries).toHaveLength(30);
    expect(overview.bucketTotalBytes).toBeGreaterThanOrEqual(0);
    expect(overview.topTenSharePct).toBeGreaterThanOrEqual(0);

    const overLimit = await storage.storageOrgs(db, {
      query: "kyte",
      sort: "pctOfLimit",
      dir: "desc",
      overLimitOnly: true,
      ...PAGE,
    });
    expect(overLimit.rows.every((row) => (row.pctOfLimit ?? 0) > 100)).toBe(true);

    const orphans = await storage.storageOrphans(db, PAGE);
    expect(orphans.total).toBeGreaterThanOrEqual(orphans.rows.length);
  });

  it("runs the per-entity detail resolvers", async () => {
    const db = getDb();
    expect(await queries.userDetail(db, "no-such-user")).toBeNull();
    expect(await queries.orgDetail(db, "no-such-org")).toBeNull();
    expect(
      await queries.kyteDetail(db, "no-such-kyte", {
        analytics: false,
        webBaseUrl: "http://localhost:3000",
        apiBaseUrl: "http://localhost:3003",
      }),
    ).toBeNull();
    expect(
      await queries.resolveModerationTarget(db, "definitely-not-a-user", "http://localhost:3000"),
    ).toBeNull();

    const user = await db.user.findFirst({ select: { id: true } });
    if (user) {
      const detail = await queries.userDetail(db, user.id);
      expect(detail?.id).toBe(user.id);
      expect(Array.isArray(detail?.memberships)).toBe(true);
    }

    const org = await db.organization.findFirst({ select: { id: true } });
    if (org) {
      const detail = await queries.orgDetail(db, org.id);
      expect(detail?.id).toBe(org.id);
      const members = await queries.orgMembers(db, { orgId: org.id, query: "", ...PAGE });
      expect(members.total).toBeGreaterThanOrEqual(members.rows.length);
      for (const sort of ["createdAt", "username", "storageBytes"] as const) {
        await queries.orgKytes(db, { orgId: org.id, query: "", sort, dir: "desc", ...PAGE });
      }
      const files = await storage.storageOrgFiles(
        db,
        {
          orgId: org.id,
          kind: "image",
          sort: "createdAt",
          dir: "desc",
          ...PAGE,
        },
        "http://localhost:3003",
      );
      expect(files.org.orgId).toBe(org.id);
    }

    const kyte = await db.kyte.findFirst({ where: { username: { not: null } } });
    if (kyte) {
      const detail = await queries.kyteDetail(db, kyte.id, {
        analytics: false,
        webBaseUrl: "http://localhost:3000",
        apiBaseUrl: "http://localhost:3003",
      });
      expect(detail?.id).toBe(kyte.id);
      // publicUrl must come from the configured web base URL, never a hardcoded host.
      if (detail?.publicUrl) expect(detail.publicUrl).toBe(`http://localhost:3000/${kyte.username}`);

      const target = await queries.resolveModerationTarget(
        db,
        (kyte.username as string).toUpperCase(),
        "http://localhost:3000",
      );
      expect(target?.kyteId).toBe(kyte.id);
    }
  });

  it("finds an org and a kyte by pasted id in globalSearch", async () => {
    const db = getDb();
    expect(await queries.globalSearch(db, "  ", 15)).toEqual([]);

    const org = await db.organization.findFirst({ select: { id: true } });
    if (org) {
      const results = await queries.globalSearch(db, org.id, 15);
      expect(results[0]?.id).toBe(org.id);
      expect(results[0]?.kind).toBe("org");
      expect(results[0]?.badge).toMatch(/kytes?$/);
    }

    const capped = await queries.globalSearch(db, "a", 3);
    expect(capped.length).toBeLessThanOrEqual(3);
  });

  it("runs the overview aggregate", async () => {
    const stats = await queries.overview(getDb(), computeCapabilities({}));
    expect(stats.signupsSeries).toHaveLength(30);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
    expect(stats.suspendedUsers).toBeGreaterThanOrEqual(0);
    expect(stats.openReports).toBeGreaterThanOrEqual(0);
    expect(stats.unresolvedAlerts).toBeGreaterThanOrEqual(0);
  });

  it("serves every export dataset that does not need a scope argument", async () => {
    const context = { db: getDb(), webBaseUrl: "http://localhost:3000", apiBaseUrl: "http://localhost:3003", limit: 10 };
    const scoped = new Set(["orgKytes", "orgMembers", "storageFiles", "topKytes", "trafficSeries"]);
    for (const dataset of EXPORT_DATASETS) {
      if (scoped.has(dataset)) continue;
      const result = await exportRows(dataset, {}, context);
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(10);
    }
  });

  it("reports a clear error when an export is missing its required scope", async () => {
    const context = { db: getDb(), webBaseUrl: "http://localhost:3000", apiBaseUrl: "http://localhost:3003", limit: 10 };
    await expect(exportRows("orgMembers", {}, context)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("traffic range coarsening", () => {
  it("keeps the requested granularity for a narrow range", () => {
    expect(resolveRange({ ...RANGE, granularity: "day" }).granularity).toBe("day");
    expect(
      resolveRange({
        from: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
        granularity: "hour",
      }).granularity,
    ).toBe("hour");
  });

  it("coarsens an hourly request that would blow past the bucket cap", () => {
    const from = new Date(Date.UTC(2024, 0, 1)).toISOString();
    expect(
      resolveRange({ from, to: new Date(Date.UTC(2024, 6, 1)).toISOString(), granularity: "hour" })
        .granularity,
    ).toBe("day");
  });

  it("never lets any accepted range exceed the bucket cap", () => {
    const to = new Date(Date.UTC(2026, 0, 1));
    for (const days of [1, 7, 31, 90, 365, 729]) {
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      for (const granularity of ["hour", "day", "week"] as const) {
        const range = resolveRange({
          from: from.toISOString(),
          to: to.toISOString(),
          granularity,
        });
        const bucketMs =
          range.granularity === "hour"
            ? 3600_000
            : range.granularity === "day"
              ? 86_400_000
              : 604_800_000;
        expect((to.getTime() - from.getTime()) / bucketMs).toBeLessThanOrEqual(750);
      }
    }
  });

  it("never coarsens past what was asked for", () => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(resolveRange({ from, to, granularity: "week" }).granularity).toBe("week");
    expect(resolveRange({ from, to, granularity: "day" }).granularity).toBe("day");
  });

  it("rejects an inverted range, a bad instant and an absurd span", () => {
    expect(() =>
      resolveRange({ from: RANGE.to, to: RANGE.from, granularity: "day" }),
    ).toThrowError(/after/);
    expect(() => resolveRange({ from: "not-a-date", to: RANGE.to, granularity: "day" })).toThrowError(
      /valid ISO/,
    );
    expect(() =>
      resolveRange({
        from: new Date(Date.UTC(2000, 0, 1)).toISOString(),
        to: new Date().toISOString(),
        granularity: "week",
      }),
    ).toThrowError(/730 days/);
  });
});

describe.skipIf(!hasDb || !hasCh)("clickhouse-backed traffic resolvers execute", () => {
  it("returns a zero-filled series, totals and a previous window", async () => {
    const range = resolveRange(RANGE);
    const series = await trafficSeries(range);
    expect(series.granularity).toBe("day");
    expect(series.points.length).toBeGreaterThanOrEqual(7);
    expect(series.points.every((point) => point.bucket.endsWith("Z"))).toBe(true);
    expect(series.totals.botPct).toBeGreaterThanOrEqual(0);
    expect(series.totals.botPct).toBeLessThanOrEqual(100);
    expect(series.previousTotals.views).toBeGreaterThanOrEqual(0);
  });

  it("labels top kytes with a username instead of a bare cuid", async () => {
    const rows = await topKytes(getDb(), resolveRange(RANGE), 5);
    for (const row of rows) {
      expect(row.kyteId).toBeTruthy();
      expect(row).toHaveProperty("username");
      expect(row).toHaveProperty("orgId");
    }
  });

  it("returns all 24 hour-of-day buckets", async () => {
    const breakdown = await trafficBreakdown(resolveRange(RANGE));
    expect(breakdown.hourOfDay).toHaveLength(24);
    expect(breakdown.hourOfDay.map((bucket) => bucket.hour)).toEqual(
      Array.from({ length: 24 }, (_, hour) => hour),
    );
  });
});

describe.skipIf(!hasDb)("the growth aggregate degrades to Postgres when analytics is off", () => {
  it("returns every Postgres number and nulls every ClickHouse one", async () => {
    const stats = await growth(getDb(), computeCapabilities({}), 30);
    expect(stats.analytics).toBe(false);
    expect(stats.series).toHaveLength(30);
    expect(stats.landingPages).toEqual([]);
    expect(stats.getStartedSurfaces).toEqual([]);
    expect(stats.activation.medianClicks).toBeNull();
    expect(stats.activation.withTenClicks).toBeNull();

    const byKey = new Map(stats.funnel.map((step) => [step.key, step]));
    expect(byKey.get("signups")?.count).toBeGreaterThanOrEqual(0);
    expect(byKey.get("launched")?.count).toBeGreaterThanOrEqual(0);
    expect(byKey.get("landing_views")?.count).toBeNull();
    expect(byKey.get("onboarded")?.count).toBeNull();
    // Every rate names its own denominator, so no step may claim one it lacks.
    for (const step of stats.funnel) {
      if (step.ratePct !== null) expect(step.ofKey).not.toBeNull();
    }
  });

  it("zero-fills the series to the requested window", async () => {
    for (const days of [7, 30, 90] as const) {
      const stats = await growth(getDb(), computeCapabilities({}), days);
      expect(stats.series).toHaveLength(days);
      expect(stats.days).toBe(days);
    }
  });
});

describe.skipIf(!hasDb || !hasCh)("the growth aggregate executes its ClickHouse half", () => {
  it("runs every product-event and per-kyte query against the real schema", async () => {
    const stats = await growth(getDb(), computeCapabilities({ CLICKHOUSE_URL: "x" }), 30);
    expect(stats.analytics).toBe(true);
    expect(stats.activation.measuredKytes).toBeLessThanOrEqual(stats.activation.cohortKytes);
    expect(stats.activation.medianClicks).toBeGreaterThanOrEqual(0);
    for (const row of stats.landingPages) expect(row.path).not.toBe("");
    for (const step of stats.funnel) expect(step.count).not.toBeNull();
  });
});
