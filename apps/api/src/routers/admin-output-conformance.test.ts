import { beforeAll, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { getDb } from "@kytelink/db";
import { createCallerFactory, EXPORT_DATASETS, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { getRedis } from "../redis";
import { PrismaStore } from "../store/prisma-store";
import { appRouter } from "./index";

const hasDb = Boolean(process.env.DATABASE_URL);
const PAGE = { page: 1, pageSize: 25 };
const RANGE = {
  from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString(),
  granularity: "day" as const,
};

const createCaller = createCallerFactory(appRouter);

let caller: ReturnType<typeof createCaller>;
let seeded: { userId: string; orgId: string; kyteId: string } | null = null;

/**
 * Calling through the router (not the query functions directly) is what forces
 * every `.output()` schema to parse the real rows. A resolver that returns a null
 * where the contract promises a string fails here and nowhere else.
 */
beforeAll(async () => {
  if (!hasDb) return;
  const db = getDb();
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return;

  setConfigForTest(
    loadConfig({
      ...process.env,
      ADMIN_EMAILS: user.email,
      WEB_BASE_URL: "http://localhost:3000",
    }),
  );

  const context: TrpcContext = {
    session: { userId: user.id, email: user.email, isAdmin: true, status: user.status },
    user: { id: user.id, email: user.email },
    ip: "127.0.0.1",
    redis: getRedis(),
    db: new PrismaStore(db, getRedis()),
    ch: getClickhouse(),
    log: logger,
  };
  caller = createCaller(context);

  const kyte = await db.kyte.findFirst({ where: { published: { isNot: null } } });
  seeded = kyte ? { userId: user.id, orgId: kyte.orgId, kyteId: kyte.id } : null;
});

describe.skipIf(!hasDb)("admin router output schemas accept the real resolvers", () => {
  it("me and overview", async () => {
    const me = await caller.admin.me();
    expect(me.email).toContain("@");
    const overview = await caller.admin.overview();
    expect(overview.signupsSeries).toHaveLength(30);
    expect(overview.capabilities).toBeDefined();
  });

  it("every paginated list returns a conforming envelope", async () => {
    const users = await caller.admin.searchUsers({ query: "", sort: "createdAt", dir: "desc", ...PAGE });
    expect(users.page).toBe(1);
    expect(users.pageSize).toBe(25);
    expect(users.total).toBeGreaterThanOrEqual(users.rows.length);

    await caller.admin.searchOrgs({ query: "", sort: "createdAt", dir: "desc", ...PAGE });
    await caller.admin.suspendedList({ search: "", sort: "suspendedAt", dir: "desc", ...PAGE });
    await caller.admin.abuseReports({ search: "", sort: "createdAt", dir: "desc", ...PAGE });
    await caller.admin.auditLog({ actorEmail: "", search: "", scope: "all", ...PAGE });
    await caller.admin.alerts({ status: "all", ...PAGE });
    await caller.admin.storageOrgs({
      query: "",
      sort: "bytes",
      dir: "desc",
      overLimitOnly: false,
      ...PAGE,
    });
    await caller.admin.storageOrphans(PAGE);
    await caller.admin.moderationQueue({ limit: 50 });
    await caller.admin.moderationInsights({ days: 30 });
    await caller.admin.storageOverview();
    await caller.admin.globalSearch({ query: "a", limit: 15 });
  });

  it("sweepStatus reports the published count and a nullable progress blob", async () => {
    const status = await caller.admin.sweepStatus();
    expect(status.publishedKytes).toBeGreaterThanOrEqual(0);
    if (status.progress) {
      expect(status.progress.processed).toBeLessThanOrEqual(status.progress.total);
      expect(status.progress.requestedBy).toEqual(expect.any(String));
    }
  });

  it("detail resolvers conform, including a suspended row with real signals", async () => {
    if (!seeded) return;
    const kyte = await caller.admin.kyteDetail({ kyteId: seeded.kyteId });
    expect(kyte?.id).toBe(seeded.kyteId);
    expect(kyte?.ownerEmail).toContain("@");

    // Parses profileContentSchema out of a real PublishedKyte row: the snapshot
    // is the one admin output that carries live profile content.
    const snapshot = await caller.admin.kytePublishedSnapshot({ kyteId: seeded.kyteId });
    expect(snapshot?.kyteId).toBe(seeded.kyteId);
    expect(snapshot?.content.theme).toEqual(expect.any(String));
    expect(await caller.admin.kytePublishedSnapshot({ kyteId: "kyte_missing" })).toBeNull();

    const org = await caller.admin.orgDetail({ orgId: seeded.orgId });
    expect(org?.id).toBe(seeded.orgId);

    await caller.admin.orgMembers({ orgId: seeded.orgId, query: "", ...PAGE });
    await caller.admin.orgKytes({
      orgId: seeded.orgId,
      query: "",
      sort: "createdAt",
      dir: "desc",
      ...PAGE,
    });
    await caller.admin.storageOrgFiles({
      orgId: seeded.orgId,
      sort: "sizeBytes",
      dir: "desc",
      ...PAGE,
    });
    const detail = await caller.admin.userDetail({ userId: seeded.userId });
    expect(detail?.id).toBe(seeded.userId);
  });

  it("a suspended row parses its signal union and source enum", async () => {
    const suspended = await caller.admin.suspendedList({
      search: "",
      sort: "suspendedAt",
      dir: "desc",
      page: 1,
      pageSize: 100,
    });
    // The seed suspends kytes with real moderation signals, so this exercises the
    // signal/source enums rather than just an empty list.
    expect(suspended.total).toBeGreaterThan(0);
    for (const row of suspended.rows) {
      expect(["auto", "seed-sweep", "manual"]).toContain(row.source);
      expect(["kyte", "org"]).toContain(row.scope);
    }
  });

  it("resolveModerationTarget returns null for an unknown handle", async () => {
    expect(await caller.admin.resolveModerationTarget({ username: "nope-not-real" })).toBeNull();
  });

  it("every export dataset conforms to exportRowsOutput", async () => {
    const scoped: Record<string, Record<string, unknown>> = {
      orgKytes: { orgId: seeded?.orgId ?? "none" },
      orgMembers: { orgId: seeded?.orgId ?? "none" },
      storageFiles: { orgId: seeded?.orgId ?? "none" },
      topKytes: RANGE,
      trafficSeries: RANGE,
    };
    for (const dataset of EXPORT_DATASETS) {
      const result = await caller.admin.exportRows({
        dataset,
        filters: scoped[dataset] ?? {},
        limit: 10,
      });
      expect(result.dataset).toBe(dataset);
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.generatedAt).toContain("T");
    }
  });

  it("traffic resolvers conform when analytics is enabled", async () => {
    if (!process.env.CLICKHOUSE_URL) return;
    const series = await caller.admin.trafficSeries(RANGE);
    expect(series.granularity).toBe("day");
    await caller.admin.topKytes({ ...RANGE, limit: 10 });
    const breakdown = await caller.admin.trafficBreakdown(RANGE);
    expect(breakdown.hourOfDay).toHaveLength(24);
    await caller.admin.platformSeries({ days: 30 });
    await caller.admin.live();
  });
});
