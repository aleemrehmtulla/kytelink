import { Prisma, type PrismaClient } from "@kytelink/db";
import {
  type AbuseReportReason,
  abuseReportReasonSchema,
  type AppealKind,
  type AppealStatus,
  type AuditAction,
  auditActionSchema,
  type Capabilities,
  isKyteEffectivelySuspended,
  type ModerationStatus,
  type ModerationVerdict,
  type ProfileContent,
  type ReportStatus,
  type Role,
  type ThemeKey,
  type UserStatus,
} from "@kytelink/schemas";
import { withQueryCache } from "../analytics/query-cache";
import { adminAssetUrl, adminProxiedContent } from "./asset-links";
import { getRedis } from "../redis";
import { columnsToContent } from "../store/content-mapping";
import { chRows, chTimestamp } from "./clickhouse-raw";
import {
  andWhere,
  iso,
  isoRequired,
  likeNeedle,
  num,
  type PageInput,
  type PagedResult,
  paged,
  pageWindow,
  publicProfileUrl,
  sortDir,
  totalOf,
  usernameFromUrlNeedle,
} from "./admin-sql";
import { storageKindOf, type StorageAssetKind } from "./storage-queries";

const OVERVIEW_TTL_SEC = 45;
const LIVE_TTL_SEC = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface OverviewStats {
  totalUsers: number;
  totalOrgs: number;
  totalKytes: number;
  publishedKytes: number;
  suspendedKytes: number;
  suspendedUsers: number;
  suspendedOrgs: number;
  openReports: number;
  openAppeals: number;
  unresolvedAlerts: number;
  signupsSeries: { date: string; count: number }[];
  usersWeekTrendPct: number;
  beaconIngestLagMs: number;
  queueDepths: { queue: string; depth: number; deadLettered: number }[];
  capabilities: Capabilities;
}

export async function overview(
  db: PrismaClient,
  capabilities: Capabilities,
): Promise<OverviewStats> {
  return withQueryCache(
    getRedis(),
    "admin:overview",
    () => computeOverview(db, capabilities),
    OVERVIEW_TTL_SEC,
  );
}

async function computeOverview(
  db: PrismaClient,
  capabilities: Capabilities,
): Promise<OverviewStats> {
  const now = Date.now();
  const windowStart = new Date(now - 30 * DAY_MS);

  const [
    totalUsers,
    totalOrgs,
    totalKytes,
    publishedKytes,
    suspendedKytes,
    suspendedUsers,
    suspendedOrgs,
    openReports,
    openAppeals,
    unresolvedAlerts,
    thisWeek,
    prevWeek,
    signupRows,
  ] = await Promise.all([
    db.user.count(),
    db.organization.count(),
    db.kyte.count(),
    db.publishedKyte.count(),
    // Effective, not column-level: a kyte whose org is suspended is down too.
    db.publishedKyte.count({
      where: {
        OR: [
          { moderationStatus: { not: "APPROVED" } },
          { kyte: { organization: { suspendedAt: { not: null } } } },
        ],
      },
    }),
    db.user.count({ where: { status: { not: "ACTIVE" } } }),
    db.organization.count({ where: { suspendedAt: { not: null } } }),
    db.abuseReport.count({ where: { status: "OPEN" } }),
    db.appeal.count({ where: { status: "OPEN" } }),
    db.adminAlert.count({ where: { resolvedAt: null } }),
    db.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    db.user.count({
      where: { createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } },
    }),
    // Grouped in SQL — the old version loaded every signup row of the last 30
    // days into memory to bucket it in JS.
    db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
             count(*)::int AS count
      FROM "User" WHERE "createdAt" >= ${windowStart}
      GROUP BY 1 ORDER BY 1
    `),
  ]);

  const counts = new Map(signupRows.map((row) => [row.date, num(row.count)]));
  const signupsSeries = Array.from({ length: 30 }, (_, index) => {
    const date = ymd(new Date(now - (29 - index) * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });

  const usersWeekTrendPct =
    prevWeek === 0
      ? thisWeek > 0
        ? 100
        : 0
      : Math.round(((thisWeek - prevWeek) / prevWeek) * 1000) / 10;

  return {
    totalUsers,
    totalOrgs,
    totalKytes,
    publishedKytes,
    suspendedKytes,
    suspendedUsers,
    suspendedOrgs,
    openReports,
    openAppeals,
    unresolvedAlerts,
    signupsSeries,
    usersWeekTrendPct,
    beaconIngestLagMs: 0,
    queueDepths: [],
    capabilities,
  };
}

export interface LiveStats {
  activeNow: number;
  viewsPerMin: { minute: string; count: number }[];
  clicksPerMin: { minute: string; count: number }[];
  signupsToday: number;
  publishesToday: number;
  activeEditors: number;
}

export async function live(db: PrismaClient): Promise<LiveStats> {
  return withQueryCache(getRedis(), "admin:live", () => computeLive(db), LIVE_TTL_SEC);
}

async function computeLive(db: PrismaClient): Promise<LiveStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since60 = chTimestamp(new Date(Date.now() - 60 * 60 * 1000));
  const since5 = chTimestamp(new Date(Date.now() - 5 * 60 * 1000));

  const [activeRows, viewRows, clickRows, editorRows, signupsToday, publishesToday] =
    await Promise.all([
      chRows<{ c: string }>(
        `SELECT uniqExact(ip_hash) AS c FROM page_hits WHERE ts >= {since:DateTime64(3)} AND is_bot = 0`,
        { since: since5 },
      ),
      chRows<{ minute: string; count: string }>(
        `SELECT toStartOfMinute(ts) AS minute, count() AS count FROM page_hits
         WHERE ts >= {since:DateTime64(3)} AND is_bot = 0 GROUP BY minute ORDER BY minute`,
        { since: since60 },
      ),
      chRows<{ minute: string; count: string }>(
        `SELECT toStartOfMinute(ts) AS minute, count() AS count FROM link_hits
         WHERE ts >= {since:DateTime64(3)} AND is_bot = 0 GROUP BY minute ORDER BY minute`,
        { since: since60 },
      ),
      chRows<{ c: string }>(
        `SELECT uniqExact(user_id) AS c FROM product_events WHERE ts >= {since:DateTime64(3)} AND user_id != ''`,
        { since: since5 },
      ),
      db.user.count({ where: { createdAt: { gte: startOfToday } } }),
      db.publishedKyte.count({ where: { publishedAt: { gte: startOfToday } } }),
    ]);

  return {
    activeNow: num(activeRows[0]?.c),
    viewsPerMin: viewRows.map((row) => ({ minute: row.minute, count: num(row.count) })),
    clicksPerMin: clickRows.map((row) => ({ minute: row.minute, count: num(row.count) })),
    signupsToday,
    publishesToday,
    activeEditors: num(editorRows[0]?.c),
  };
}

export interface UserSummaryRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  orgCount: number;
  kyteCount: number;
  storageBytes: number;
  status: UserStatus;
  statusReason: string | null;
}

export interface SearchUsersInput extends PageInput {
  query: string;
  status?: UserStatus;
  sort: "createdAt" | "email" | "name" | "storageBytes" | "orgCount";
  dir: "asc" | "desc";
}

const USER_SORT: Record<SearchUsersInput["sort"], Prisma.Sql> = {
  createdAt: Prisma.sql`f."createdAt"`,
  email: Prisma.sql`f.email`,
  name: Prisma.sql`f.name`,
  storageBytes: Prisma.sql`bytes`,
  orgCount: Prisma.sql`org_count`,
};

/**
 * `kyteCount`/`storageBytes` are scoped to the orgs the user OWNS — that is the
 * content the account is answerable for, and it is what "biggest users" means.
 * The whole page (plus its accurate total) is one query: the previous version ran
 * two extra queries per user row.
 */
export async function searchUsers(
  db: PrismaClient,
  input: SearchUsersInput,
): Promise<PagedResult<UserSummaryRow>> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [];
  const needle = input.query.trim();
  if (needle) {
    const like = likeNeedle(needle);
    conditions.push(
      Prisma.sql`(u.email ILIKE ${like} ESCAPE '\\' OR u.name ILIKE ${like} ESCAPE '\\' OR u.id = ${needle})`,
    );
  }
  if (input.status) conditions.push(Prisma.sql`(u.status = ${input.status}::"UserStatus")`);

  const rows = await db.$queryRaw<
    {
      id: string;
      email: string;
      name: string | null;
      createdAt: Date;
      status: UserStatus;
      statusReason: string | null;
      org_count: number;
      kyte_count: number;
      bytes: bigint | null;
      total: number;
    }[]
  >(Prisma.sql`
    WITH filtered AS (
      SELECT u.id, u.email, u.name, u."createdAt", u.status, u."statusReason"
      FROM "User" u WHERE ${andWhere(conditions)}
    ),
    orgs AS (
      SELECT om."userId" AS user_id, count(*)::int AS org_count FROM "OrgMember" om
      WHERE om."userId" IN (SELECT id FROM filtered) GROUP BY om."userId"
    ),
    owned AS (
      SELECT om."userId" AS user_id,
             count(DISTINCT k.id)::int AS kyte_count,
             COALESCE(sum(ka.bytes), 0)::bigint AS bytes
      FROM "OrgMember" om
      JOIN "Kyte" k ON k."orgId" = om."orgId"
      LEFT JOIN (
        SELECT "kyteId", sum("sizeBytes")::bigint AS bytes FROM "Asset" GROUP BY "kyteId"
      ) ka ON ka."kyteId" = k.id
      WHERE om.role = 'OWNER' AND om."userId" IN (SELECT id FROM filtered)
      GROUP BY om."userId"
    )
    SELECT f.id, f.email, f.name, f."createdAt", f.status, f."statusReason",
           COALESCE(o.org_count, 0) AS org_count,
           COALESCE(w.kyte_count, 0) AS kyte_count,
           COALESCE(w.bytes, 0) AS bytes,
           (count(*) OVER ())::int AS total
    FROM filtered f
    LEFT JOIN orgs o ON o.user_id = f.id
    LEFT JOIN owned w ON w.user_id = f.id
    ORDER BY ${USER_SORT[input.sort]} ${sortDir(input.dir)} NULLS LAST, f.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: isoRequired(row.createdAt),
      orgCount: num(row.org_count),
      kyteCount: num(row.kyte_count),
      storageBytes: num(row.bytes),
      status: row.status,
      statusReason: row.statusReason,
    })),
    totalOf(rows),
    input,
  );
}

export interface UserDetail extends UserSummaryRow {
  memberships: {
    orgId: string;
    orgName: string;
    role: Role;
    effectiveRole: Role;
    kyteCount: number;
    storageBytes: number;
  }[];
  kytes: {
    id: string;
    orgId: string;
    orgName: string;
    username: string | null;
    displayName: string | null;
    published: boolean;
    moderationStatus: ModerationStatus;
    orgSuspended: boolean;
  }[];
  passkeyCount: number;
  sessionCount: number;
  invitesSent: number;
  invitesReceived: number;
  maxOwnedOrgsOverride: number | null;
  maxJoinedOrgsOverride: number | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  lastSessionAt: string | null;
  platformRole: "USER" | "ADMIN";
  publishedKyteCount: number;
}

export async function userDetail(db: PrismaClient, userId: string): Promise<UserDetail | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { passkeys: true, sessions: true, orgMemberships: true } } },
  });
  if (!user) return null;

  const [memberships, kytes, invitesSent, invitesReceived, lastSession] = await Promise.all([
    db.$queryRaw<
      {
        org_id: string;
        org_name: string;
        role: Role;
        kyte_count: number;
        published_count: number;
        bytes: bigint | null;
      }[]
    >(Prisma.sql`
      SELECT om."orgId" AS org_id, o.name AS org_name, om.role,
             (SELECT count(*)::int FROM "Kyte" k WHERE k."orgId" = om."orgId") AS kyte_count,
             (SELECT count(*)::int FROM "Kyte" k
              JOIN "PublishedKyte" p ON p."kyteId" = k.id
              WHERE k."orgId" = om."orgId") AS published_count,

             COALESCE((
               SELECT sum(a."sizeBytes")::bigint FROM "Asset" a
               JOIN "Kyte" k2 ON k2.id = a."kyteId" WHERE k2."orgId" = om."orgId"
             ), 0)::bigint AS bytes
      FROM "OrgMember" om JOIN "Organization" o ON o.id = om."orgId"
      WHERE om."userId" = ${userId}
      ORDER BY o.name ASC
    `),
    db.$queryRaw<
      {
        id: string;
        org_id: string;
        org_name: string;
        username: string | null;
        display_name: string | null;
        published: boolean;
        moderation_status: ModerationStatus | null;
        org_suspended: boolean;
      }[]
    >(Prisma.sql`
      SELECT k.id, k."orgId" AS org_id, o.name AS org_name, k.username,
             k."displayName" AS display_name,
             (p."kyteId" IS NOT NULL) AS published,
             p."moderationStatus" AS moderation_status,
             (o."suspendedAt" IS NOT NULL) AS org_suspended
      FROM "Kyte" k
      JOIN "Organization" o ON o.id = k."orgId"
      LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      WHERE k."orgId" IN (SELECT om."orgId" FROM "OrgMember" om WHERE om."userId" = ${userId})
      ORDER BY o.name ASC, k.username ASC NULLS LAST, k."createdAt" ASC
    `),
    db.orgInvite.count({ where: { invitedById: userId } }),
    db.orgInvite.count({ where: { email: user.email.toLowerCase() } }),
    db.session.aggregate({ _max: { createdAt: true }, where: { userId } }),
  ]);

  const owned = memberships.filter((row) => row.role === "OWNER");
  const ownedBytes = owned.reduce((total, row) => total + num(row.bytes), 0);
  const ownedKytes = owned.reduce((total, row) => total + num(row.kyte_count), 0);
  // Exactly what suspending this person would take offline: every published
  // kyte in every org they belong to, since the cascade suspends all of them.
  // Orgs already suspended are excluded by the query, so the confirmation copy
  // never overstates the blast radius.
  const publishedKyteCount = memberships.reduce(
    (total, row) => total + num(row.published_count),
    0,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: isoRequired(user.createdAt),
    orgCount: user._count.orgMemberships,
    kyteCount: ownedKytes,
    storageBytes: ownedBytes,
    status: user.status,
    statusReason: user.statusReason,
    memberships: memberships.map((row) => ({
      orgId: row.org_id,
      orgName: row.org_name,
      role: row.role,
      effectiveRole: row.role,
      kyteCount: num(row.kyte_count),
      storageBytes: num(row.bytes),
    })),
    kytes: kytes.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      username: row.username,
      displayName: row.display_name,
      published: row.published,
      moderationStatus: row.moderation_status ?? "APPROVED",
      orgSuspended: row.org_suspended,
    })),
    passkeyCount: user._count.passkeys,
    sessionCount: user._count.sessions,
    invitesSent,
    invitesReceived,
    maxOwnedOrgsOverride: user.maxOwnedOrgs,
    maxJoinedOrgsOverride: user.maxJoinedOrgs,
    statusChangedAt: iso(user.statusChangedAt),
    statusChangedBy: user.statusChangedBy,
    lastSessionAt: iso(lastSession._max.createdAt),
    platformRole: user.role,
    publishedKyteCount,
  };
}

export async function setUserLimits(
  db: PrismaClient,
  input: { userId: string; maxOwnedOrgs: number | null; maxJoinedOrgs: number | null },
): Promise<void> {
  await db.user.update({
    where: { id: input.userId },
    data: { maxOwnedOrgs: input.maxOwnedOrgs, maxJoinedOrgs: input.maxJoinedOrgs },
  });
}

export interface AdminOrgSummary {
  id: string;
  name: string;
  personal: boolean;
  createdAt: string;
  ownerUserId: string | null;
  ownerEmail: string;
  kyteCount: number;
  publishedKyteCount: number;
  memberCount: number;
  storageBytes: number;
  storageLimitBytes: number | null;
  suspendedAt: string | null;
}

export interface SearchOrgsInput extends PageInput {
  query: string;
  sort: "createdAt" | "name" | "storageBytes" | "kyteCount" | "memberCount";
  dir: "asc" | "desc";
}

const ORG_SORT: Record<SearchOrgsInput["sort"], Prisma.Sql> = {
  createdAt: Prisma.sql`f."createdAt"`,
  name: Prisma.sql`f.name`,
  storageBytes: Prisma.sql`bytes`,
  kyteCount: Prisma.sql`kyte_count`,
  memberCount: Prisma.sql`member_count`,
};

const ORG_OWNER_CTE = Prisma.sql`
  owner AS (
    SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, om."userId" AS owner_user_id, u.email
    FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
    WHERE om.role = 'OWNER' AND om."orgId" IN (SELECT id FROM filtered)
    ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
  )
`;

export async function searchOrgs(
  db: PrismaClient,
  input: SearchOrgsInput,
): Promise<PagedResult<AdminOrgSummary>> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [];
  const needle = input.query.trim();
  if (needle) {
    const like = likeNeedle(needle);
    conditions.push(
      Prisma.sql`(o.name ILIKE ${like} ESCAPE '\\' OR o.id = ${needle}
        OR EXISTS (
          SELECT 1 FROM "OrgMember" om2 JOIN "User" u2 ON u2.id = om2."userId"
          WHERE om2."orgId" = o.id AND u2.email ILIKE ${like} ESCAPE '\\'
        ))`,
    );
  }

  const rows = await db.$queryRaw<
    {
      id: string;
      name: string;
      personal: boolean;
      createdAt: Date;
      owner_user_id: string | null;
      owner_email: string | null;
      kyte_count: number;
      published_count: number;
      member_count: number;
      bytes: bigint | null;
      limit_bytes: bigint | null;
      suspendedAt: Date | null;
      total: number;
    }[]
  >(Prisma.sql`
    WITH filtered AS (
      SELECT o.id, o.name, o.personal, o."createdAt", o."maxStorageBytes", o."suspendedAt"
      FROM "Organization" o WHERE ${andWhere(conditions)}
    ),
    ${ORG_OWNER_CTE},
    kytes AS (
      SELECT k."orgId" AS org_id, count(*)::int AS kyte_count,
             count(p."kyteId")::int AS published_count
      FROM "Kyte" k LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      WHERE k."orgId" IN (SELECT id FROM filtered) GROUP BY k."orgId"
    ),
    members AS (
      SELECT om."orgId" AS org_id, count(*)::int AS member_count FROM "OrgMember" om
      WHERE om."orgId" IN (SELECT id FROM filtered) GROUP BY om."orgId"
    ),
    bytes AS (
      SELECT k."orgId" AS org_id, sum(a."sizeBytes")::bigint AS bytes
      FROM "Asset" a JOIN "Kyte" k ON k.id = a."kyteId"
      WHERE k."orgId" IN (SELECT id FROM filtered) GROUP BY k."orgId"
    )
    SELECT f.id, f.name, f.personal, f."createdAt", f."suspendedAt",
           ow.owner_user_id, ow.email AS owner_email,
           COALESCE(kt.kyte_count, 0) AS kyte_count,
           COALESCE(kt.published_count, 0) AS published_count,
           COALESCE(m.member_count, 0) AS member_count,
           COALESCE(b.bytes, 0) AS bytes,
           f."maxStorageBytes" AS limit_bytes,
           (count(*) OVER ())::int AS total
    FROM filtered f
    LEFT JOIN owner ow ON ow.org_id = f.id
    LEFT JOIN kytes kt ON kt.org_id = f.id
    LEFT JOIN members m ON m.org_id = f.id
    LEFT JOIN bytes b ON b.org_id = f.id
    ORDER BY ${ORG_SORT[input.sort]} ${sortDir(input.dir)} NULLS LAST, f.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(rows.map(orgSummaryRow), totalOf(rows), input);
}

function orgSummaryRow(row: {
  id: string;
  name: string;
  personal: boolean;
  createdAt: Date;
  owner_user_id: string | null;
  owner_email: string | null;
  kyte_count: number;
  published_count: number;
  member_count: number;
  bytes: bigint | null;
  limit_bytes: bigint | null;
  suspendedAt: Date | null;
}): AdminOrgSummary {
  return {
    id: row.id,
    name: row.name,
    personal: row.personal,
    createdAt: isoRequired(row.createdAt),
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email ?? "",
    kyteCount: num(row.kyte_count),
    publishedKyteCount: num(row.published_count),
    memberCount: num(row.member_count),
    storageBytes: num(row.bytes),
    storageLimitBytes: row.limit_bytes === null ? null : num(row.limit_bytes),
    suspendedAt: iso(row.suspendedAt),
  };
}

interface OrgLimitOverrides {
  kytesPerOrg: number | null;
  peoplePerOrg: number | null;
  schedulesPerKyte: number | null;
  storageBytesPerOrg: number | null;
  uploadMaxBytes: number | null;
}

export interface OrgDetail extends AdminOrgSummary {
  suspendedKyteCount: number;
  assetCount: number;
  limitOverrides: OrgLimitOverrides;
  suspensionReason: string | null;
  suspendedBy: string | null;
  suspensionCause: string | null;
}

export async function orgDetail(db: PrismaClient, orgId: string): Promise<OrgDetail | null> {
  const rows = await db.$queryRaw<
    {
      id: string;
      name: string;
      personal: boolean;
      createdAt: Date;
      owner_user_id: string | null;
      owner_email: string | null;
      kyte_count: number;
      published_count: number;
      suspended_count: number;
      member_count: number;
      bytes: bigint | null;
      asset_count: number;
      limit_bytes: bigint | null;
      max_kytes: number | null;
      max_members: number | null;
      max_schedules: number | null;
      upload_bytes: bigint | null;
      suspendedAt: Date | null;
      suspensionReason: string | null;
      suspendedBy: string | null;
      suspensionCause: string | null;
    }[]
  >(Prisma.sql`
    WITH filtered AS (SELECT o.* FROM "Organization" o WHERE o.id = ${orgId}),
    ${ORG_OWNER_CTE}
    SELECT f.id, f.name, f.personal, f."createdAt", f."suspendedAt",
           f."suspensionReason", f."suspendedBy", f."suspensionCause",
           ow.owner_user_id, ow.email AS owner_email,
           (SELECT count(*)::int FROM "Kyte" k WHERE k."orgId" = f.id) AS kyte_count,
           (SELECT count(*)::int FROM "Kyte" k JOIN "PublishedKyte" p ON p."kyteId" = k.id
            WHERE k."orgId" = f.id) AS published_count,
           (SELECT count(*)::int FROM "Kyte" k JOIN "PublishedKyte" p ON p."kyteId" = k.id
            WHERE k."orgId" = f.id
              AND (p."moderationStatus" <> 'APPROVED' OR f."suspendedAt" IS NOT NULL)) AS suspended_count,
           (SELECT count(*)::int FROM "OrgMember" om WHERE om."orgId" = f.id) AS member_count,
           COALESCE((SELECT sum(a."sizeBytes")::bigint FROM "Asset" a
                     JOIN "Kyte" k ON k.id = a."kyteId" WHERE k."orgId" = f.id), 0)::bigint AS bytes,
           COALESCE((SELECT count(*)::int FROM "Asset" a
                     JOIN "Kyte" k ON k.id = a."kyteId" WHERE k."orgId" = f.id), 0) AS asset_count,
           f."maxStorageBytes" AS limit_bytes,
           f."maxKytes" AS max_kytes, f."maxMembers" AS max_members,
           f."maxSchedulesPerKyte" AS max_schedules,
           f."maxUploadBytes" AS upload_bytes
    FROM filtered f LEFT JOIN owner ow ON ow.org_id = f.id
  `);

  const row = rows[0];
  if (!row) return null;

  return {
    ...orgSummaryRow(row),
    suspendedKyteCount: num(row.suspended_count),
    assetCount: num(row.asset_count),
    suspensionReason: row.suspensionReason,
    suspendedBy: row.suspendedBy,
    suspensionCause: row.suspensionCause,
    limitOverrides: {
      kytesPerOrg: row.max_kytes,
      peoplePerOrg: row.max_members,
      schedulesPerKyte: row.max_schedules,
      storageBytesPerOrg: row.limit_bytes === null ? null : num(row.limit_bytes),
      uploadMaxBytes: row.upload_bytes === null ? null : num(row.upload_bytes),
    },
  };
}

export interface AdminOrgMember {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  userStatus: UserStatus;
  joinedAt: string;
}

export interface OrgMembersInput extends PageInput {
  orgId: string;
  query: string;
}

export async function orgMembers(
  db: PrismaClient,
  input: OrgMembersInput,
): Promise<PagedResult<AdminOrgMember>> {
  const { limit, offset } = pageWindow(input);
  const needle = input.query.trim();
  const where: Prisma.OrgMemberWhereInput = {
    orgId: input.orgId,
    ...(needle
      ? {
          user: {
            OR: [
              { email: { contains: needle, mode: "insensitive" as const } },
              { name: { contains: needle, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.orgMember.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      skip: offset,
      take: limit,
    }),
    db.orgMember.count({ where }),
  ]);

  return paged(
    rows.map((row) => ({
      membershipId: `${row.orgId}:${row.userId}`,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      role: row.role,
      userStatus: row.user.status,
      joinedAt: isoRequired(row.createdAt),
    })),
    total,
    input,
  );
}

export interface OrgKyteRow {
  id: string;
  username: string | null;
  displayName: string | null;
  published: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
  storageBytes: number;
  assetCount: number;
}

export interface OrgKytesInput extends PageInput {
  orgId: string;
  query: string;
  moderationStatus?: ModerationStatus;
  sort: "createdAt" | "username" | "storageBytes";
  dir: "asc" | "desc";
}

export async function orgKytes(
  db: PrismaClient,
  input: OrgKytesInput,
): Promise<PagedResult<OrgKyteRow>> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [Prisma.sql`(k."orgId" = ${input.orgId})`];
  const needle = input.query.trim();
  if (needle) {
    const like = likeNeedle(needle);
    conditions.push(
      Prisma.sql`(k.username ILIKE ${like} ESCAPE '\\' OR k."displayName" ILIKE ${like} ESCAPE '\\' OR k.id = ${needle})`,
    );
  }
  if (input.moderationStatus) {
    conditions.push(
      Prisma.sql`(COALESCE(p."moderationStatus", 'APPROVED'::"ModerationStatus") = ${input.moderationStatus}::"ModerationStatus")`,
    );
  }

  const sortExpr =
    input.sort === "username"
      ? Prisma.sql`f.username`
      : input.sort === "storageBytes"
        ? Prisma.sql`bytes`
        : Prisma.sql`f."createdAt"`;

  const rows = await db.$queryRaw<
    {
      id: string;
      username: string | null;
      displayName: string | null;
      published: boolean;
      moderation_status: ModerationStatus;
      createdAt: Date;
      bytes: bigint | null;
      asset_count: number;
      total: number;
    }[]
  >(Prisma.sql`
    WITH filtered AS (
      SELECT k.id, k.username, k."displayName", k."createdAt",
             (p."kyteId" IS NOT NULL) AS published,
             COALESCE(p."moderationStatus", 'APPROVED'::"ModerationStatus") AS moderation_status
      FROM "Kyte" k LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      WHERE ${andWhere(conditions)}
    ),
    assets AS (
      SELECT a."kyteId" AS kyte_id, sum(a."sizeBytes")::bigint AS bytes, count(*)::int AS asset_count
      FROM "Asset" a WHERE a."kyteId" IN (SELECT id FROM filtered) GROUP BY a."kyteId"
    )
    SELECT f.id, f.username, f."displayName", f.published, f.moderation_status, f."createdAt",
           COALESCE(ast.bytes, 0) AS bytes,
           COALESCE(ast.asset_count, 0) AS asset_count,
           (count(*) OVER ())::int AS total
    FROM filtered f LEFT JOIN assets ast ON ast.kyte_id = f.id
    ORDER BY ${sortExpr} ${sortDir(input.dir)} NULLS LAST, f.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      published: row.published,
      moderationStatus: row.moderation_status,
      createdAt: isoRequired(row.createdAt),
      storageBytes: num(row.bytes),
      assetCount: num(row.asset_count),
    })),
    totalOf(rows),
    input,
  );
}

/** Newest-first, so hitting the cap drops the window's oldest days, never today. */
const RECENT_KYTES_CAP = 500;

export interface RecentKyteRow {
  id: string;
  orgId: string;
  orgName: string;
  personalOrg: boolean;
  ownerEmail: string | null;
  username: string | null;
  displayName: string | null;
  published: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

export async function recentKytes(
  db: PrismaClient,
  days: number,
): Promise<{ rows: RecentKyteRow[]; total: number; capped: boolean }> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.$queryRaw<
    {
      id: string;
      orgId: string;
      org_name: string;
      personal: boolean;
      owner_email: string | null;
      username: string | null;
      displayName: string | null;
      published: boolean;
      moderation_status: ModerationStatus;
      createdAt: Date;
      total: number;
    }[]
  >(Prisma.sql`
    SELECT k.id, k."orgId", o.name AS org_name, o.personal,
           owner.email AS owner_email,
           k.username, k."displayName", k."createdAt",
           (p."kyteId" IS NOT NULL) AS published,
           COALESCE(p."moderationStatus", 'APPROVED'::"ModerationStatus") AS moderation_status,
           (count(*) OVER ())::int AS total
    FROM "Kyte" k
    JOIN "Organization" o ON o.id = k."orgId"
    LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
    LEFT JOIN LATERAL (
      SELECT u.email FROM "OrgMember" m JOIN "User" u ON u.id = m."userId"
      WHERE m."orgId" = k."orgId" AND m.role = 'OWNER'
      ORDER BY m."createdAt" ASC LIMIT 1
    ) owner ON true
    WHERE k."createdAt" >= ${from}
    ORDER BY k."createdAt" DESC, k.id ASC
    LIMIT ${RECENT_KYTES_CAP}
  `);

  const total = totalOf(rows);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      orgId: row.orgId,
      orgName: row.org_name,
      personalOrg: row.personal,
      ownerEmail: row.owner_email,
      username: row.username,
      displayName: row.displayName,
      published: row.published,
      moderationStatus: row.moderation_status,
      createdAt: isoRequired(row.createdAt),
    })),
    total,
    capped: total > rows.length,
  };
}

interface KyteAssetRow {
  id: string;
  kind: StorageAssetKind;
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploaderEmail: string | null;
}

export interface KyteDetail {
  id: string;
  orgId: string;
  orgName: string;
  ownerEmail: string;
  ownerUserId: string | null;
  ownerStatus: UserStatus;
  username: string | null;
  displayName: string | null;
  theme: ThemeKey;
  published: boolean;
  publicUrl: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  storageBytes: number;
  memberCount: number;
  members: AdminOrgMember[];
  publishHistory: { seq: number; publishedAt: string; scheduled: boolean }[];
  moderationHistory: {
    id: string;
    verdict: "APPROVE" | "SUSPEND";
    reason: string;
    provider: string;
    reviewedBy: string | null;
    createdAt: string;
  }[];
  assets: KyteAssetRow[];
  trafficSparkline: { date: string; views: number }[];
}

export async function kyteDetail(
  db: PrismaClient,
  kyteId: string,
  options: { analytics: boolean; webBaseUrl: string; apiBaseUrl: string },
): Promise<KyteDetail | null> {
  const kyte = await db.kyte.findUnique({
    where: { id: kyteId },
    include: {
      organization: {
        include: {
          members: {
            include: { user: { select: { id: true, email: true, name: true, status: true } } },
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      published: true,
      assets: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!kyte) return null;

  const uploaderIds = [
    ...new Set(kyte.assets.map((asset) => asset.uploadedById).filter((id): id is string => !!id)),
  ];
  const [reviews, schedules, uploaders] = await Promise.all([
    db.moderationReview.findMany({ where: { kyteId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.scheduledPublish.findMany({
      where: { kyteId, status: "PUBLISHED" },
      orderBy: { firedAt: "desc" },
      take: 20,
      select: { firedAt: true },
    }),
    uploaderIds.length > 0
      ? db.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, email: true } })
      : Promise.resolve([]),
  ]);
  const uploaderEmail = new Map(uploaders.map((user) => [user.id, user.email]));

  let trafficSparkline: { date: string; views: number }[] = [];
  if (options.analytics) {
    const rows = await chRows<{ date: string; views: string }>(
      `SELECT date, sum(views) AS views FROM page_hits_daily
       WHERE kyte_id = {kyteId:String} AND date >= today() - 13 GROUP BY date ORDER BY date`,
      { kyteId },
    );
    const views = new Map(rows.map((row) => [row.date, num(row.views)]));
    trafficSparkline = Array.from({ length: 14 }, (_, index) => {
      const date = ymd(new Date(Date.now() - (13 - index) * DAY_MS));
      return { date, views: views.get(date) ?? 0 };
    });
  }

  const owner = kyte.organization.members.find((member) => member.role === "OWNER");
  const publishHistory = kyte.published
    ? [
        {
          seq: kyte.published.publishSeq,
          publishedAt: isoRequired(kyte.published.publishedAt),
          scheduled: false,
        },
        ...schedules
          .filter((schedule) => schedule.firedAt !== null)
          .map((schedule, index) => ({
            seq: Math.max(0, (kyte.published?.publishSeq ?? 0) - index - 1),
            publishedAt: isoRequired(schedule.firedAt as Date),
            scheduled: true,
          })),
      ]
    : [];

  return {
    id: kyte.id,
    orgId: kyte.orgId,
    orgName: kyte.organization.name,
    ownerEmail: owner?.user.email ?? "",
    ownerUserId: owner?.userId ?? null,
    ownerStatus: owner?.user.status ?? "ACTIVE",
    username: kyte.username,
    displayName: kyte.displayName,
    theme: kyte.theme as ThemeKey,
    published: kyte.published !== null,
    publicUrl: kyte.published ? publicProfileUrl(options.webBaseUrl, kyte.username) : null,
    moderationStatus: kyte.published?.moderationStatus ?? "APPROVED",
    createdAt: isoRequired(kyte.createdAt),
    storageBytes: kyte.assets.reduce((total, asset) => total + asset.sizeBytes, 0),
    memberCount: kyte.organization.members.length,
    members: kyte.organization.members.map((member) => ({
      membershipId: `${member.orgId}:${member.userId}`,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      userStatus: member.user.status,
      joinedAt: isoRequired(member.createdAt),
    })),
    publishHistory,
    moderationHistory: reviews.map((review) => ({
      id: review.id,
      verdict: review.verdict,
      reason: review.reason,
      provider: review.provider,
      reviewedBy: review.reviewedBy,
      createdAt: isoRequired(review.createdAt),
    })),
    assets: kyte.assets.map((asset) => ({
      id: asset.id,
      kind: storageKindOf(asset.kind),
      key: asset.key,
      url: adminAssetUrl(options.apiBaseUrl, asset.key),
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      createdAt: isoRequired(asset.createdAt),
      uploaderEmail: asset.uploadedById ? uploaderEmail.get(asset.uploadedById) ?? null : null,
    })),
    trafficSparkline,
  };
}

type ModerationSignalKey =
  | "sus_links"
  | "sus_names"
  | "sus_redirect"
  | "sus_email_domain"
  | "nsfw";

interface ModerationSignal {
  key: ModerationSignalKey;
  label: string;
  evidence: string;
}

const SIGNAL_JSON_KEYS: Record<ModerationSignalKey, string[]> = {
  sus_links: ["sus_link"],
  sus_names: ["sus_name"],
  sus_redirect: ["sus_redirect"],
  sus_email_domain: ["sus_email"],
  nsfw: ["nsfw_image", "nsfw_text"],
};

function extractSignals(signals: unknown): {
  display: ModerationSignal[];
  confidence: number | null;
} {
  if (!signals || typeof signals !== "object") return { display: [], confidence: null };
  const bag = signals as Record<string, unknown>;
  const display: ModerationSignal[] = [];
  if (Array.isArray(bag.sus_link)) {
    for (const entry of bag.sus_link as { url?: string; pattern?: string }[]) {
      display.push({
        key: "sus_links",
        label: "Suspicious link",
        evidence: entry.url ?? entry.pattern ?? "",
      });
    }
  }
  if (bag.sus_name && typeof bag.sus_name === "object") {
    const value = bag.sus_name as { keyword?: string; value?: string };
    display.push({
      key: "sus_names",
      label: "Suspicious name",
      evidence: value.keyword ?? value.value ?? "",
    });
  }
  if (bag.sus_redirect && typeof bag.sus_redirect === "object") {
    display.push({
      key: "sus_redirect",
      label: "Suspicious redirect",
      evidence: (bag.sus_redirect as { url?: string }).url ?? "",
    });
  }
  if (bag.sus_email && typeof bag.sus_email === "object") {
    display.push({
      key: "sus_email_domain",
      label: "Suspicious email domain",
      evidence: (bag.sus_email as { domain?: string }).domain ?? "",
    });
  }
  let confidence: number | null = null;
  for (const key of ["nsfw_image", "nsfw_text"] as const) {
    if (bag[key] && typeof bag[key] === "object") {
      const value = bag[key] as { reason?: string; confidence?: number };
      display.push({ key: "nsfw", label: "NSFW", evidence: value.reason ?? "" });
      if (typeof value.confidence === "number") confidence = value.confidence;
    }
  }
  return { display, confidence };
}

type ModerationSource = "auto" | "seed-sweep" | "manual";
// Which scope took the kyte down. An org-suspended kyte keeps moderationStatus
// APPROVED, so the list has to look past the column to stay honest.
type SuspensionScope = "kyte" | "org";

export interface SuspendedRow {
  kyteId: string;
  orgId: string;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  email: string;
  userStatus: UserStatus;
  suspendedAt: string;
  scope: SuspensionScope;
  source: ModerationSource;
  signals: ModerationSignal[];
  reasonOrNote: string;
  reviewedBy: string | null;
  confidence: number | null;
  reportCount: number;
  verdict: ModerationVerdict | null;
  provider: string | null;
  reviewedAt: string | null;
}

export interface SuspendedListInput extends PageInput {
  search: string;
  signals?: ModerationSignalKey[];
  scope?: SuspensionScope;
  source?: ModerationSource;
  excludeUpheld?: boolean;
  sort: "suspendedAt" | "username" | "confidence";
  dir: "asc" | "desc";
}

/**
 * Filtering, sorting and paging all happen in SQL. The previous version took the
 * first 300 rows, ran one moderationReview lookup per row, then filtered in JS —
 * so its "total" was a lie and rows past 300 were invisible.
 */
export async function suspendedList(
  db: PrismaClient,
  input: SuspendedListInput,
): Promise<PagedResult<SuspendedRow>> {
  const { limit, offset } = pageWindow(input);
  const scopeCondition =
    input.scope === "kyte"
      ? Prisma.sql`p."moderationStatus" <> 'APPROVED'`
      : input.scope === "org"
        ? Prisma.sql`p."moderationStatus" = 'APPROVED' AND o."suspendedAt" IS NOT NULL`
        : Prisma.sql`(p."moderationStatus" <> 'APPROVED' OR o."suspendedAt" IS NOT NULL)`;

  const outer: Prisma.Sql[] = [];
  if (input.source) outer.push(Prisma.sql`(r.source = ${input.source})`);
  if (input.excludeUpheld) outer.push(Prisma.sql`(NOT r.upheld)`);
  if (input.signals && input.signals.length > 0) {
    const keys = input.signals.flatMap((key) => SIGNAL_JSON_KEYS[key]);
    outer.push(
      Prisma.sql`(${Prisma.join(
        keys.map((key) => Prisma.sql`jsonb_exists(r.signals, ${key})`),
        " OR ",
      )})`,
    );
  }
  const needle = input.search.trim();
  if (needle) {
    const like = likeNeedle(needle);
    const handle = usernameFromUrlNeedle(needle);
    const handleLike = handle ? likeNeedle(handle) : like;
    // Matches what the row actually renders: the reason clause mirrors the
    // reasonOrNote mapping below (scope picks the column, NULL falls back),
    // and a pasted profile URL matches through its extracted handle.
    outer.push(
      Prisma.sql`(r.username ILIKE ${like} ESCAPE '\\' OR r.username ILIKE ${handleLike} ESCAPE '\\'
        OR r."displayName" ILIKE ${like} ESCAPE '\\'
        OR r.email ILIKE ${like} ESCAPE '\\' OR r.signals::text ILIKE ${like} ESCAPE '\\'
        OR COALESCE(CASE WHEN r.scope = 'org' THEN r.org_reason ELSE r.reason END,
             'Suspended by moderation.') ILIKE ${like} ESCAPE '\\'
        OR r."kyteId" = ${needle})`,
    );
  }

  const sortExpr =
    input.sort === "username"
      ? Prisma.sql`r.username`
      : input.sort === "confidence"
        ? Prisma.sql`r.confidence`
        : Prisma.sql`r."suspendedAt"`;

  const rows = await db.$queryRaw<
    {
      kyteId: string;
      orgId: string;
      userId: string | null;
      username: string | null;
      displayName: string | null;
      email: string;
      user_status: UserStatus;
      suspendedAt: Date;
      scope: SuspensionScope;
      source: ModerationSource;
      org_reason: string | null;
      signals: unknown;
      reason: string | null;
      reviewedBy: string | null;
      confidence: number | null;
      verdict: ModerationVerdict | null;
      provider: string | null;
      reviewedAt: Date | null;
      report_count: number;
      total: number;
    }[]
  >(Prisma.sql`
    WITH targets AS (
      SELECT p."kyteId", p.username, p."displayName", k."orgId",
             CASE WHEN p."moderationStatus" <> 'APPROVED' THEN p."publishedAt"
                  ELSE o."suspendedAt" END AS "suspendedAt",
             CASE WHEN p."moderationStatus" <> 'APPROVED' THEN 'kyte'
                  ELSE 'org' END AS scope,
             o."suspensionReason" AS org_reason
      FROM "PublishedKyte" p
      JOIN "Kyte" k ON k.id = p."kyteId"
      JOIN "Organization" o ON o.id = k."orgId"
      WHERE ${scopeCondition}
    ),
    latest AS (
      SELECT DISTINCT ON (mr."kyteId") mr."kyteId", mr.reason, mr.provider, mr."reviewedBy",
             mr.confidence, mr.signals, mr.verdict, mr."createdAt" AS "reviewedAt"
      FROM "ModerationReview" mr
      WHERE mr."kyteId" IN (SELECT "kyteId" FROM targets)
      ORDER BY mr."kyteId", mr."createdAt" DESC
    ),
    owner AS (
      SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, om."userId" AS owner_user_id,
             u.email, u.status
      FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
      WHERE om.role = 'OWNER' AND om."orgId" IN (SELECT "orgId" FROM targets)
      ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
    ),
    reports AS (
      SELECT ar.username, count(*)::int AS c FROM "AbuseReport" ar
      WHERE ar.username IN (SELECT username FROM targets)
      GROUP BY ar.username
    ),
    r AS (
      SELECT t."kyteId", t."orgId", t.username, t."displayName",
             t."suspendedAt", t.scope, t.org_reason,
             ow.owner_user_id AS "userId", COALESCE(ow.email, '') AS email,
             COALESCE(ow.status, 'ACTIVE'::"UserStatus") AS user_status,
             l.reason, l."reviewedBy", l.confidence, l.signals,
             l.verdict, l."reviewedAt", l.provider,
             CASE
               WHEN l."reviewedBy" IS NOT NULL THEN 'manual'
               WHEN l.provider IN ('deterministic', 'openai') THEN 'auto'
               ELSE 'seed-sweep'
             END AS source,
             COALESCE(l.verdict = 'SUSPEND' AND l.provider = 'admin'
               AND l."reviewedBy" IS NOT NULL, false) AS upheld,
             COALESCE(rep.c, 0) AS report_count
      FROM targets t
      LEFT JOIN latest l ON l."kyteId" = t."kyteId"
      LEFT JOIN owner ow ON ow.org_id = t."orgId"
      LEFT JOIN reports rep ON rep.username = t.username
    )
    SELECT r.*, (count(*) OVER ())::int AS total FROM r
    WHERE ${andWhere(outer)}
    ORDER BY ${sortExpr} ${sortDir(input.dir)} NULLS LAST, r."kyteId" ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => {
      const { display, confidence } = extractSignals(row.signals);
      return {
        kyteId: row.kyteId,
        orgId: row.orgId,
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        email: row.email,
        userStatus: row.user_status,
        suspendedAt: isoRequired(row.suspendedAt),
        scope: row.scope,
        source: row.source,
        signals: display,
        reasonOrNote:
          (row.scope === "org" ? row.org_reason : row.reason) ?? "Suspended by moderation.",
        reviewedBy: row.reviewedBy,
        confidence: row.confidence ?? confidence,
        reportCount: num(row.report_count),
        verdict: row.verdict,
        provider: row.provider,
        reviewedAt: iso(row.reviewedAt),
      };
    }),
    totalOf(rows),
    input,
  );
}

export interface ModerationCounts {
  openReports: number;
  oldestOpenReportAt: string | null;
  openAppeals: number;
  suspendedAccounts: number;
  offlineKytes: number;
  suspendedLast24h: number;
}

/**
 * One round trip of pure counts for the queue-health strip. The 24h window uses
 * the same suspendedAt derivation as suspendedList's targets CTE, so the strip
 * and the list can never disagree about what counts as "suspended today".
 */
export async function moderationCounts(db: PrismaClient): Promise<ModerationCounts> {
  const [row] = await db.$queryRaw<
    {
      open_reports: number;
      oldest_open_at: Date | null;
      open_appeals: number;
      suspended_accounts: number;
      offline_kytes: number;
      suspended_last_24h: number;
    }[]
  >(Prisma.sql`
    SELECT
      (SELECT count(*) FROM "AbuseReport" WHERE status = 'OPEN')::int AS open_reports,
      (SELECT min("createdAt") FROM "AbuseReport" WHERE status = 'OPEN') AS oldest_open_at,
      (SELECT count(*) FROM "Appeal" WHERE status = 'OPEN')::int AS open_appeals,
      (SELECT count(*) FROM "User" WHERE status <> 'ACTIVE')::int AS suspended_accounts,
      (SELECT count(*)
         FROM "PublishedKyte" p
         JOIN "Kyte" k ON k.id = p."kyteId"
         JOIN "Organization" o ON o.id = k."orgId"
        WHERE p."moderationStatus" <> 'APPROVED' OR o."suspendedAt" IS NOT NULL)::int AS offline_kytes,
      (SELECT count(*)
         FROM "PublishedKyte" p
         JOIN "Kyte" k ON k.id = p."kyteId"
         JOIN "Organization" o ON o.id = k."orgId"
        WHERE (p."moderationStatus" <> 'APPROVED' OR o."suspendedAt" IS NOT NULL)
          AND CASE WHEN p."moderationStatus" <> 'APPROVED'
                   THEN p."publishedAt" ELSE o."suspendedAt" END
              >= now() - interval '24 hours')::int AS suspended_last_24h
  `);

  return {
    openReports: num(row?.open_reports ?? 0),
    oldestOpenReportAt: row?.oldest_open_at ? isoRequired(row.oldest_open_at) : null,
    openAppeals: num(row?.open_appeals ?? 0),
    suspendedAccounts: num(row?.suspended_accounts ?? 0),
    offlineKytes: num(row?.offline_kytes ?? 0),
    suspendedLast24h: num(row?.suspended_last_24h ?? 0),
  };
}

export interface KyteReviewDetail {
  id: string;
  verdict: ModerationVerdict;
  reason: string;
  provider: string;
  confidence: number | null;
  reviewedBy: string | null;
  signals: ModerationSignal[];
  createdAt: string;
}

export interface KytePublishedSnapshot {
  kyteId: string;
  orgId: string;
  username: string | null;
  content: ProfileContent;
  moderationStatus: ModerationStatus;
  orgSuspended: boolean;
  suspensionReason: string | null;
  publishedAt: string;
  publishSeq: number;
  publicUrl: string | null;
  latestReview: KyteReviewDetail | null;
  reviewHistory: KyteReviewDetail[];
}

const SNAPSHOT_HISTORY_LIMIT = 20;

function toReviewDetail(row: {
  id: string;
  verdict: ModerationVerdict;
  reason: string;
  provider: string;
  confidence: number | null;
  reviewedBy: string | null;
  signals: unknown;
  createdAt: Date;
}): KyteReviewDetail {
  const { display, confidence } = extractSignals(row.signals);
  return {
    id: row.id,
    verdict: row.verdict,
    reason: row.reason,
    provider: row.provider,
    confidence: row.confidence ?? confidence,
    reviewedBy: row.reviewedBy,
    signals: display,
    createdAt: isoRequired(row.createdAt),
  };
}

/**
 * Deliberately not resolveProfile: that path answers "what should a visitor
 * see", which for a suspended page is nothing. Review needs the opposite —
 * the stored PublishedKyte row rendered as-is, straight from Postgres with no
 * Redis profile cache in the way, so a takedown can actually be judged.
 */
export async function kytePublishedSnapshot(
  db: PrismaClient,
  kyteId: string,
  webBaseUrl: string,
  apiBaseUrl: string,
): Promise<KytePublishedSnapshot | null> {
  const published = await db.publishedKyte.findUnique({
    where: { kyteId },
    include: {
      kyte: {
        select: {
          orgId: true,
          organization: { select: { suspendedAt: true, suspensionReason: true } },
        },
      },
    },
  });
  if (!published) return null;

  const [avatar, reviews] = await Promise.all([
    published.avatarAssetId
      ? db.asset.findUnique({ where: { id: published.avatarAssetId }, select: { key: true } })
      : Promise.resolve(null),
    db.moderationReview.findMany({
      where: { kyteId },
      orderBy: { createdAt: "desc" },
      take: SNAPSHOT_HISTORY_LIMIT,
    }),
  ]);

  const org = published.kyte.organization;
  const content: ProfileContent = adminProxiedContent(
    {
      ...columnsToContent(published),
      avatar: avatar
        ? {
            url: adminAssetUrl(apiBaseUrl, avatar.key),
            lqip: adminAssetUrl(apiBaseUrl, avatar.key, { lqip: true }),
          }
        : null,
    },
    apiBaseUrl,
  );
  const history = reviews.map(toReviewDetail);
  const suspended = isKyteEffectivelySuspended({
    moderationStatus: published.moderationStatus,
    orgSuspendedAt: org.suspendedAt,
  });
  const latestSuspend = history.find((review) => review.verdict === "SUSPEND");

  return {
    kyteId,
    orgId: published.kyte.orgId,
    username: published.username,
    content,
    moderationStatus: published.moderationStatus,
    orgSuspended: org.suspendedAt !== null,
    suspensionReason: suspended
      ? latestSuspend?.reason ?? org.suspensionReason ?? "Suspended by moderation."
      : null,
    publishedAt: isoRequired(published.publishedAt),
    publishSeq: published.publishSeq,
    publicUrl: publicProfileUrl(webBaseUrl, published.username),
    latestReview: history[0] ?? null,
    reviewHistory: history,
  };
}

export interface AbuseReportRow {
  id: string;
  kyteId: string;
  orgId: string;
  userId: string | null;
  username: string | null;
  ownerEmail: string | null;
  reportedUrl: string;
  reason: AbuseReportReason;
  details: string;
  reportCountForKyte: number;
  kyteModerationStatus: ModerationStatus | null;
  userStatus: UserStatus | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  openedByAdmin: boolean;
}

export interface AbuseReportsInput extends PageInput {
  status?: ReportStatus;
  reason?: AbuseReportReason;
  search: string;
  sort: "createdAt" | "reportCountForKyte";
  dir: "asc" | "desc";
}

export async function abuseReports(
  db: PrismaClient,
  input: AbuseReportsInput,
  webBaseUrl: string,
): Promise<PagedResult<AbuseReportRow>> {
  const { limit, offset } = pageWindow(input);
  const inner: Prisma.Sql[] = [];
  if (input.status) inner.push(Prisma.sql`(ar.status = ${input.status}::"ReportStatus")`);
  if (input.reason) inner.push(Prisma.sql`(ar.reason = ${input.reason})`);

  const outer: Prisma.Sql[] = [];
  const needle = input.search.trim();
  if (needle) {
    const like = likeNeedle(needle);
    // The search box promises URL matching, and reportedUrl is derived from the
    // username — so a pasted profile URL matches through its extracted handle.
    const handle = usernameFromUrlNeedle(needle);
    const handleLike = handle ? likeNeedle(handle) : like;
    outer.push(
      Prisma.sql`(r.username ILIKE ${like} ESCAPE '\\' OR r.username ILIKE ${handleLike} ESCAPE '\\'
        OR r.details ILIKE ${like} ESCAPE '\\'
        OR r.owner_email ILIKE ${like} ESCAPE '\\' OR r.id = ${needle} OR r.kyte_id = ${needle})`,
    );
  }

  const sortExpr =
    input.sort === "reportCountForKyte" ? Prisma.sql`r.report_count` : Prisma.sql`r."createdAt"`;

  const rows = await db.$queryRaw<
    {
      id: string;
      kyte_id: string | null;
      org_id: string | null;
      userId: string | null;
      username: string;
      owner_email: string | null;
      reason: string;
      details: string | null;
      report_count: number;
      moderation_status: ModerationStatus | null;
      user_status: UserStatus | null;
      status: ReportStatus;
      createdAt: Date;
      reviewedAt: Date | null;
      reviewedBy: string | null;
      opened_by: string | null;
      total: number;
    }[]
  >(Prisma.sql`
    WITH filtered AS (
      SELECT ar.*, COALESCE(
               ar."kyteId",
               (SELECT k2.id FROM "Kyte" k2 WHERE k2.username = ar.username)
             ) AS resolved_kyte_id
      FROM "AbuseReport" ar WHERE ${andWhere(inner)}
    ),
    counts AS (SELECT ar.username, count(*)::int AS c FROM "AbuseReport" ar GROUP BY ar.username),
    owner AS (
      SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, om."userId" AS owner_user_id,
             u.email, u.status
      FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
      WHERE om.role = 'OWNER'
      ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
    ),
    r AS (
      SELECT f.id, k.id AS kyte_id, k."orgId" AS org_id, f.username,
             ow.owner_user_id AS "userId", ow.email AS owner_email, ow.status AS user_status,
             f.reason, f.details, f.status, f."createdAt", f."reviewedAt", f."reviewedBy",
             f."openedBy" AS opened_by,
             p."moderationStatus" AS moderation_status,
             COALESCE(c.c, 0) AS report_count
      FROM filtered f
      LEFT JOIN "Kyte" k ON k.id = f.resolved_kyte_id
      LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      LEFT JOIN owner ow ON ow.org_id = k."orgId"
      LEFT JOIN counts c ON c.username = f.username
    )
    SELECT r.*, (count(*) OVER ())::int AS total FROM r
    WHERE ${andWhere(outer)}
    ORDER BY ${sortExpr} ${sortDir(input.dir)} NULLS LAST, r.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => {
      const reason = abuseReportReasonSchema.safeParse(row.reason);
      return {
        id: row.id,
        kyteId: row.kyte_id ?? "",
        orgId: row.org_id ?? "",
        userId: row.userId,
        username: row.username,
        ownerEmail: row.owner_email,
        reportedUrl: publicProfileUrl(webBaseUrl, row.username) ?? "",
        reason: reason.success ? reason.data : "other",
        details: row.details ?? "",
        reportCountForKyte: num(row.report_count),
        kyteModerationStatus: row.moderation_status,
        userStatus: row.user_status,
        status: row.status,
        createdAt: isoRequired(row.createdAt),
        reviewedAt: iso(row.reviewedAt),
        reviewedBy: row.reviewedBy,
        openedByAdmin: row.opened_by !== null,
      };
    }),
    totalOf(rows),
    input,
  );
}

export interface ModerationTarget {
  kyteId: string;
  orgId: string;
  orgName: string;
  orgSuspended: boolean;
  orgPersonal: boolean;
  username: string | null;
  displayName: string | null;
  publicUrl: string | null;
  published: boolean;
  moderationStatus: ModerationStatus;
  userId: string | null;
  ownerEmail: string;
  userStatus: UserStatus;
  ownerPublishedKyteCount: number;
  openReportCount: number;
  storageBytes: number;
  createdAt: string;
}

export async function resolveModerationTarget(
  db: PrismaClient,
  username: string,
  webBaseUrl: string,
): Promise<ModerationTarget | null> {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) return null;
  const kyte =
    (await db.kyte.findUnique({
      where: { username: handle },
      include: { organization: true, published: true },
    })) ??
    (await db.kyte.findFirst({
      where: { username: { equals: handle, mode: "insensitive" } },
      include: { organization: true, published: true },
    }));
  if (!kyte) return null;

  const [owner, reportCount, bytes, ownerPublished] = await Promise.all([
    db.orgMember.findFirst({
      where: { orgId: kyte.orgId, role: "OWNER" },
      orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
      include: { user: { select: { id: true, email: true, status: true } } },
    }),
    db.abuseReport.count({
      where: { status: "OPEN", OR: [{ kyteId: kyte.id }, { username: kyte.username ?? handle }] },
    }),
    db.asset.aggregate({ _sum: { sizeBytes: true }, where: { kyteId: kyte.id } }),
    // The blast radius suspending the owner would have: published kytes in
    // every org they belong to (any role) that is not already suspended,
    // matching the cascade rule in setUserStatus.
    db.$queryRaw<{ c: number }[]>(Prisma.sql`
      SELECT COALESCE(count(*), 0)::int AS c
      FROM "OrgMember" om
      JOIN "Organization" o ON o.id = om."orgId"
      JOIN "Kyte" k ON k."orgId" = om."orgId"
      JOIN "PublishedKyte" p ON p."kyteId" = k.id
      WHERE o."suspendedAt" IS NULL
        AND om."userId" = (
          SELECT om2."userId" FROM "OrgMember" om2
          WHERE om2."orgId" = ${kyte.orgId} AND om2.role = 'OWNER'
          ORDER BY om2."createdAt" ASC, om2."userId" ASC LIMIT 1
        )
    `),
  ]);

  return {
    kyteId: kyte.id,
    orgId: kyte.orgId,
    orgName: kyte.organization.name,
    orgSuspended: kyte.organization.suspendedAt !== null,
    orgPersonal: kyte.organization.personal,
    username: kyte.username,
    displayName: kyte.displayName,
    publicUrl: kyte.published ? publicProfileUrl(webBaseUrl, kyte.username) : null,
    published: kyte.published !== null,
    moderationStatus:
      kyte.organization.suspendedAt !== null
        ? "SUSPENDED"
        : (kyte.published?.moderationStatus ?? "APPROVED"),
    userId: owner?.userId ?? null,
    ownerEmail: owner?.user.email ?? "",
    userStatus: owner?.user.status ?? "ACTIVE",
    ownerPublishedKyteCount: num(ownerPublished[0]?.c),
    openReportCount: reportCount,
    storageBytes: bytes._sum.sizeBytes ?? 0,
    createdAt: isoRequired(kyte.createdAt),
  };
}

export async function abuseReportTarget(
  db: PrismaClient,
  reportId: string,
): Promise<{ reportId: string; username: string; kyteId: string | null } | null> {
  const report = await db.abuseReport.findUnique({ where: { id: reportId } });
  if (!report) return null;
  const kyteId =
    report.kyteId ??
    (await db.kyte.findUnique({ where: { username: report.username }, select: { id: true } }))?.id ??
    null;
  return { reportId: report.id, username: report.username, kyteId };
}

export async function markAbuseReportReviewed(
  db: PrismaClient,
  reportId: string,
  action: "suspend" | "dismiss",
  actorEmail: string,
): Promise<void> {
  await db.abuseReport.update({
    where: { id: reportId },
    data: {
      status: action === "dismiss" ? "DISMISSED" : "ACTIONED",
      reviewedAt: new Date(),
      reviewedBy: actorEmail,
    },
  });
}

export async function createAdminAbuseReport(
  db: PrismaClient,
  input: { username: string; reason: string; details: string; openedBy: string },
): Promise<string> {
  const kyteId = (
    await db.kyte.findUnique({ where: { username: input.username }, select: { id: true } })
  )?.id;
  const report = await db.abuseReport.create({
    data: {
      username: input.username,
      kyteId: kyteId ?? null,
      reason: input.reason,
      details: input.details,
      // No reporter IP exists for an admin-opened case; openedBy carries the provenance.
      ipHash: "",
      openedBy: input.openedBy,
      status: "OPEN",
    },
  });
  return report.id;
}

export interface AppealRow {
  id: string;
  kind: AppealKind;
  handle: string;
  email: string;
  message: string;
  status: AppealStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  kyteId: string | null;
  orgId: string | null;
  userId: string | null;
  suspended: boolean;
}

export interface AppealsInput extends PageInput {
  status?: AppealStatus;
  kind?: AppealKind;
  search: string;
  dir: "asc" | "desc";
}

/**
 * An appeal stores free text, never a foreign key — the person appealing may be
 * locked out, mistyped, or naming something that no longer exists. Targets are
 * resolved per page so the reviewer gets a link and a live suspension state
 * without intake ever having to confirm that a handle is real.
 */
async function resolveAppealTargets(
  db: PrismaClient,
  rows: { kind: AppealKind; handle: string; email: string }[],
): Promise<Map<string, { kyteId: string | null; orgId: string | null; userId: string | null; suspended: boolean }>> {
  const resolved = new Map<
    string,
    { kyteId: string | null; orgId: string | null; userId: string | null; suspended: boolean }
  >();
  const handles = rows.filter((row) => row.kind === "kyte").map((row) => row.handle.toLowerCase());
  const orgHandles = rows.filter((row) => row.kind === "org").map((row) => row.handle);
  const emails = rows.filter((row) => row.kind === "user").map((row) => row.email.toLowerCase());

  const [kytes, orgs, users] = await Promise.all([
    handles.length === 0
      ? []
      : db.kyte.findMany({
          where: { username: { in: handles } },
          select: {
            id: true,
            orgId: true,
            username: true,
            published: { select: { moderationStatus: true } },
            organization: { select: { suspendedAt: true } },
          },
        }),
    orgHandles.length === 0
      ? []
      : db.organization.findMany({
          where: { OR: [{ id: { in: orgHandles } }, { name: { in: orgHandles } }] },
          select: { id: true, name: true, suspendedAt: true },
        }),
    emails.length === 0
      ? []
      : db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, status: true } }),
  ]);

  for (const kyte of kytes) {
    if (!kyte.username) continue;
    resolved.set(`kyte:${kyte.username.toLowerCase()}`, {
      kyteId: kyte.id,
      orgId: kyte.orgId,
      userId: null,
      suspended: isKyteEffectivelySuspended({
        moderationStatus: kyte.published?.moderationStatus ?? "APPROVED",
        orgSuspendedAt: kyte.organization.suspendedAt,
      }),
    });
  }
  for (const org of orgs) {
    const entry = {
      kyteId: null,
      orgId: org.id,
      userId: null,
      suspended: org.suspendedAt !== null,
    };
    resolved.set(`org:${org.id}`, entry);
    resolved.set(`org:${org.name}`, entry);
  }
  for (const user of users) {
    resolved.set(`user:${user.email.toLowerCase()}`, {
      kyteId: null,
      orgId: null,
      userId: user.id,
      suspended: user.status === "SUSPENDED",
    });
  }
  return resolved;
}

export async function appeals(
  db: PrismaClient,
  input: AppealsInput,
): Promise<PagedResult<AppealRow>> {
  const { limit, offset } = pageWindow(input);
  const needle = input.search.trim();
  const where = {
    status: input.status,
    kind: input.kind,
    ...(needle
      ? {
          OR: [
            { handle: { contains: needle, mode: "insensitive" as const } },
            { email: { contains: needle, mode: "insensitive" as const } },
            { message: { contains: needle, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.appeal.findMany({
      where,
      orderBy: { createdAt: input.dir },
      take: limit,
      skip: offset,
    }),
    db.appeal.count({ where }),
  ]);

  const targets = await resolveAppealTargets(db, rows);
  return paged(
    rows.map((row) => {
      const key =
        row.kind === "user"
          ? `user:${row.email.toLowerCase()}`
          : row.kind === "org"
            ? `org:${row.handle}`
            : `kyte:${row.handle.toLowerCase()}`;
      const target = targets.get(key);
      return {
        id: row.id,
        kind: row.kind,
        handle: row.handle,
        email: row.email,
        message: row.message,
        status: row.status,
        createdAt: isoRequired(row.createdAt),
        reviewedAt: iso(row.reviewedAt),
        reviewedBy: row.reviewedBy,
        kyteId: target?.kyteId ?? null,
        orgId: target?.orgId ?? null,
        userId: target?.userId ?? null,
        suspended: target?.suspended ?? false,
      };
    }),
    total,
    input,
  );
}

export async function setAppealResolved(
  db: PrismaClient,
  appealId: string,
  status: "RESOLVED" | "DISMISSED",
  actorEmail: string,
): Promise<{ kind: AppealKind; handle: string; email: string } | null> {
  const appeal = await db.appeal.findUnique({ where: { id: appealId } });
  if (!appeal) return null;
  await db.appeal.update({
    where: { id: appealId },
    data: { status, reviewedAt: new Date(), reviewedBy: actorEmail },
  });
  return { kind: appeal.kind, handle: appeal.handle, email: appeal.email };
}

export interface AuditLogRow {
  id: string;
  action: AuditAction;
  actorEmail: string;
  actorName: string | null;
  isAdminAction: boolean;
  orgId: string | null;
  orgName: string | null;
  kyteId: string | null;
  summary: string;
  createdAt: string;
}

export interface AuditLogInput extends PageInput {
  orgId?: string;
  kyteId?: string;
  actorEmail: string;
  search: string;
  action?: AuditAction;
  scope: "all" | "admin" | "product";
  from?: string;
  to?: string;
}

export async function auditLog(
  db: PrismaClient,
  input: AuditLogInput,
): Promise<PagedResult<AuditLogRow>> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [];
  if (input.orgId) conditions.push(Prisma.sql`(a."orgId" = ${input.orgId})`);
  if (input.kyteId) conditions.push(Prisma.sql`(a."kyteId" = ${input.kyteId})`);
  if (input.action) conditions.push(Prisma.sql`(a.action = ${input.action})`);
  if (input.scope === "admin") conditions.push(Prisma.sql`(a.action LIKE 'admin.%')`);
  if (input.scope === "product") conditions.push(Prisma.sql`(a.action NOT LIKE 'admin.%')`);
  // A contains match, not the old exact-email equality that made this filter unusable.
  const actor = input.actorEmail.trim();
  if (actor) {
    conditions.push(Prisma.sql`(u.email ILIKE ${likeNeedle(actor)} ESCAPE '\\')`);
  }
  const needle = input.search.trim();
  if (needle) {
    const like = likeNeedle(needle);
    conditions.push(
      Prisma.sql`(a.summary ILIKE ${like} ESCAPE '\\' OR u.email ILIKE ${like} ESCAPE '\\')`,
    );
  }
  const from = parseOptionalInstant(input.from);
  const to = parseOptionalInstant(input.to);
  if (from) conditions.push(Prisma.sql`(a."createdAt" >= ${from})`);
  if (to) conditions.push(Prisma.sql`(a."createdAt" <= ${to})`);

  const rows = await db.$queryRaw<
    {
      id: string;
      action: string;
      actor_email: string | null;
      actor_name: string | null;
      actor_id: string;
      orgId: string | null;
      org_name: string | null;
      kyteId: string | null;
      summary: string;
      createdAt: Date;
      total: number;
    }[]
  >(Prisma.sql`
    SELECT a.id, a.action, u.email AS actor_email, u.name AS actor_name, a."actorId" AS actor_id,
           a."orgId", o.name AS org_name, a."kyteId", a.summary, a."createdAt",
           (count(*) OVER ())::int AS total
    FROM "AuditLog" a
    LEFT JOIN "User" u ON u.id = a."actorId"
    LEFT JOIN "Organization" o ON o.id = a."orgId"
    WHERE ${andWhere(conditions)}
    ORDER BY a."createdAt" DESC, a.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => {
      const action = auditActionSchema.safeParse(row.action);
      return {
        id: row.id,
        action: action.success ? action.data : "publish",
        actorEmail: row.actor_email ?? row.actor_id,
        actorName: row.actor_name,
        isAdminAction: row.action.startsWith("admin."),
        orgId: row.orgId,
        orgName: row.org_name,
        kyteId: row.kyteId,
        summary: row.summary,
        createdAt: isoRequired(row.createdAt),
      };
    }),
    totalOf(rows),
    input,
  );
}

function parseOptionalInstant(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface AlertRow {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  occurrences: number;
  lastSeenAt: string;
}

export interface AlertsInput extends PageInput {
  status: "unresolved" | "resolved" | "all";
  kind?: string;
}

export interface AlertsResult extends PagedResult<AlertRow> {
  counts: { unresolved: number; resolved: number };
  kinds: { kind: string; unresolved: number; total: number }[];
}

export async function alerts(db: PrismaClient, input: AlertsInput): Promise<AlertsResult> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [];
  if (input.status === "unresolved") conditions.push(Prisma.sql`(a."resolvedAt" IS NULL)`);
  if (input.status === "resolved") conditions.push(Prisma.sql`(a."resolvedAt" IS NOT NULL)`);
  if (input.kind) conditions.push(Prisma.sql`(a.kind = ${input.kind})`);

  const [rows, facets] = await Promise.all([
    // occurrences/lastSeenAt come from one grouped pass, not a count per row.
    db.$queryRaw<
      {
        id: string;
        kind: string;
        message: string;
        createdAt: Date;
        resolvedAt: Date | null;
        resolvedBy: string | null;
        occurrences: number;
        last_seen_at: Date;
        total: number;
      }[]
    >(Prisma.sql`
      WITH grouped AS (
        SELECT kind, message, count(*)::int AS occurrences, max("createdAt") AS last_seen_at
        FROM "AdminAlert" GROUP BY kind, message
      )
      SELECT a.id, a.kind, a.message, a."createdAt", a."resolvedAt", a."resolvedBy",
             g.occurrences, g.last_seen_at,
             (count(*) OVER ())::int AS total
      FROM "AdminAlert" a
      JOIN grouped g ON g.kind = a.kind AND g.message = a.message
      WHERE ${andWhere(conditions)}
      ORDER BY a."createdAt" DESC, a.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.$queryRaw<{ kind: string; unresolved: number; total: number }[]>(Prisma.sql`
      SELECT kind,
             count(*) FILTER (WHERE "resolvedAt" IS NULL)::int AS unresolved,
             count(*)::int AS total
      FROM "AdminAlert" GROUP BY kind ORDER BY unresolved DESC, kind ASC
    `),
  ]);

  const unresolved = facets.reduce((total, facet) => total + num(facet.unresolved), 0);
  const all = facets.reduce((total, facet) => total + num(facet.total), 0);

  return {
    ...paged(
      rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        message: row.message,
        createdAt: isoRequired(row.createdAt),
        resolvedAt: iso(row.resolvedAt),
        resolvedBy: row.resolvedBy,
        occurrences: num(row.occurrences),
        lastSeenAt: isoRequired(row.last_seen_at),
      })),
      totalOf(rows),
      input,
    ),
    counts: { unresolved, resolved: all - unresolved },
    kinds: facets.map((facet) => ({
      kind: facet.kind,
      unresolved: num(facet.unresolved),
      total: num(facet.total),
    })),
  };
}

export async function setAlertResolved(
  db: PrismaClient,
  alertId: string,
  actorEmail: string | null,
): Promise<{ kind: string; message: string } | null> {
  const alert = await db.adminAlert.findUnique({ where: { id: alertId } });
  if (!alert) return null;
  await db.adminAlert.update({
    where: { id: alertId },
    data:
      actorEmail === null
        ? { resolvedAt: null, resolvedBy: null }
        : { resolvedAt: new Date(), resolvedBy: actorEmail },
  });
  return { kind: alert.kind, message: alert.message };
}

export async function resolveAlertsByKind(
  db: PrismaClient,
  kind: string,
  actorEmail: string,
): Promise<number> {
  const result = await db.adminAlert.updateMany({
    where: { kind, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedBy: actorEmail },
  });
  return result.count;
}

export interface GlobalSearchResult {
  kind: "user" | "org" | "kyte";
  id: string;
  label: string;
  sublabel: string;
  badge: string | null;
  href: string;
}

const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

const MODERATION_LABEL: Record<ModerationStatus, string> = {
  APPROVED: "Live",
  SUSPENDED: "Suspended",
};

export async function globalSearch(
  db: PrismaClient,
  query: string,
  limit: number,
): Promise<GlobalSearchResult[]> {
  const needle = query.trim().replace(/^@/, "");
  if (!needle) return [];
  const contains = { contains: needle, mode: "insensitive" as const };

  const [users, orgs, kytes] = await Promise.all([
    db.user.findMany({
      where: { OR: [{ id: needle }, { email: contains }, { name: contains }] },
      select: { id: true, email: true, name: true, status: true },
      take: limit,
    }),
    db.organization.findMany({
      // Pasting a cuid must find the thing — exact id match alongside the name substring.
      where: { OR: [{ id: needle }, { name: contains }] },
      include: { _count: { select: { kytes: true } } },
      take: limit,
    }),
    db.kyte.findMany({
      where: { OR: [{ id: needle }, { username: contains }, { displayName: contains }] },
      select: {
        id: true,
        orgId: true,
        username: true,
        displayName: true,
        published: { select: { moderationStatus: true } },
      },
      take: limit,
    }),
  ]);

  const results: GlobalSearchResult[] = [
    ...users.map((user) => ({
      kind: "user" as const,
      id: user.id,
      label: user.name ?? user.email,
      sublabel: user.email,
      badge: user.status === "ACTIVE" ? null : USER_STATUS_LABEL[user.status],
      href: `/users/${user.id}`,
    })),
    ...orgs.map((org) => ({
      kind: "org" as const,
      id: org.id,
      label: org.name,
      sublabel: org.personal ? "Personal organization" : "Organization",
      badge: `${org._count.kytes} ${org._count.kytes === 1 ? "kyte" : "kytes"}`,
      href: `/orgs/${org.id}`,
    })),
    ...kytes.map((kyte) => ({
      kind: "kyte" as const,
      id: kyte.id,
      label: kyte.username ? `@${kyte.username}` : "(no username)",
      sublabel: kyte.displayName ?? "",
      badge: kyte.published
        ? MODERATION_LABEL[kyte.published.moderationStatus]
        : "Draft",
      href: `/orgs/${kyte.orgId}/${kyte.id}`,
    })),
  ];

  // Exact-id hits float to the top so a pasted cuid is the first row.
  // Slicing the concatenated list would let a flood of user hits bury every org
  // and kyte, so each kind gets a share and only the leftovers are redistributed.
  const exact = results.filter((result) => result.id === needle);
  const rest = results.filter((result) => result.id !== needle);
  const share = Math.max(1, Math.floor((limit - exact.length) / 3));
  const picked: typeof rest = [];
  const overflow: typeof rest = [];
  for (const kind of ["user", "org", "kyte"] as const) {
    const ofKind = rest.filter((result) => result.kind === kind);
    picked.push(...ofKind.slice(0, share));
    overflow.push(...ofKind.slice(share));
  }
  return [...exact, ...picked, ...overflow].slice(0, limit);
}

export interface ModerationInsightsInput {
  days: number;
}

export interface ModerationInsights {
  days: number;
  totalInWindow: number;
  openInWindow: number;
  actionedInWindow: number;
  medianPerDay: number;
  busiestDate: string | null;
  busiestCount: number;
  perDay: { date: string; reports: number; openReports: number }[];
  byReason: { reason: AbuseReportReason; reports: number; openReports: number }[];
  repeatTargets: {
    username: string;
    kyteId: string | null;
    orgId: string | null;
    ownerEmail: string | null;
    reports: number;
    openReports: number;
    reporters: number;
    moderationStatus: ModerationStatus | null;
    lastReportedAt: string;
  }[];
  ownerDomains: {
    domain: string;
    reports: number;
    accounts: number;
    suspendedAccounts: number;
  }[];
  reporters: { fingerprint: string; reports: number; targets: number; dismissed: number }[];
}

const INSIGHT_LIST_LIMIT = 8;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/**
 * Everything the Patterns page shows, aggregated over the whole window rather
 * than the current page of the reports table. Reporters are grouped by ipHash
 * — the only reporter identity the schema keeps — so it answers "is one source
 * filing all of these?" without storing anything new about the reporter.
 */
export async function moderationInsights(
  db: PrismaClient,
  input: ModerationInsightsInput,
): Promise<ModerationInsights> {
  const since = new Date(Date.now() - input.days * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const [perDayRows, reasonRows, targetRows, domainRows, reporterRows] = await Promise.all([
    db.$queryRaw<{ day: Date; reports: bigint; open_reports: bigint }[]>(Prisma.sql`
      SELECT date_trunc('day', ar."createdAt") AS day,
             count(*) AS reports,
             count(*) FILTER (WHERE ar.status = 'OPEN') AS open_reports
      FROM "AbuseReport" ar
      WHERE ar."createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC
    `),
    db.$queryRaw<{ reason: string; reports: bigint; open_reports: bigint }[]>(Prisma.sql`
      SELECT ar.reason,
             count(*) AS reports,
             count(*) FILTER (WHERE ar.status = 'OPEN') AS open_reports
      FROM "AbuseReport" ar
      WHERE ar."createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC
    `),
    db.$queryRaw<
      {
        username: string;
        kyte_id: string | null;
        org_id: string | null;
        owner_email: string | null;
        moderation_status: ModerationStatus | null;
        reports: bigint;
        open_reports: bigint;
        reporters: bigint;
        last_reported_at: Date;
      }[]
    >(Prisma.sql`
      WITH owner AS (
        SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, u.email
        FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
        WHERE om.role = 'OWNER'
        ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
      ),
      grouped AS (
        SELECT ar.username,
               count(*) AS reports,
               count(*) FILTER (WHERE ar.status = 'OPEN') AS open_reports,
               count(DISTINCT ar."ipHash") AS reporters,
               max(ar."createdAt") AS last_reported_at
        FROM "AbuseReport" ar
        WHERE ar."createdAt" >= ${since}
        GROUP BY 1
        HAVING count(*) > 1
        ORDER BY 2 DESC, 5 DESC
        LIMIT ${INSIGHT_LIST_LIMIT}
      )
      SELECT g.username, k.id AS kyte_id, k."orgId" AS org_id, ow.email AS owner_email,
             p."moderationStatus" AS moderation_status,
             g.reports, g.open_reports, g.reporters, g.last_reported_at
      FROM grouped g
      LEFT JOIN "Kyte" k ON k.username = g.username
      LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
      LEFT JOIN owner ow ON ow.org_id = k."orgId"
      ORDER BY g.reports DESC, g.last_reported_at DESC
    `),
    db.$queryRaw<
      { domain: string; reports: bigint; accounts: bigint; suspended_accounts: bigint }[]
    >(Prisma.sql`
      WITH owner AS (
        SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, u.id AS user_id, u.email, u.status
        FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
        WHERE om.role = 'OWNER'
        ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
      )
      SELECT lower(split_part(ow.email, '@', 2)) AS domain,
             count(*) AS reports,
             count(DISTINCT ow.user_id) AS accounts,
             count(DISTINCT ow.user_id) FILTER (WHERE ow.status <> 'ACTIVE') AS suspended_accounts
      FROM "AbuseReport" ar
      JOIN "Kyte" k ON k.username = ar.username
      JOIN owner ow ON ow.org_id = k."orgId"
      WHERE ar."createdAt" >= ${since} AND position('@' in ow.email) > 0
      GROUP BY 1 ORDER BY 2 DESC, 1 ASC
      LIMIT ${INSIGHT_LIST_LIMIT}
    `),
    db.$queryRaw<
      { ip_hash: string; reports: bigint; targets: bigint; dismissed: bigint }[]
    >(Prisma.sql`
      SELECT ar."ipHash" AS ip_hash,
             count(*) AS reports,
             count(DISTINCT ar.username) AS targets,
             count(*) FILTER (WHERE ar.status = 'DISMISSED') AS dismissed
      FROM "AbuseReport" ar
      WHERE ar."createdAt" >= ${since}
      GROUP BY 1
      HAVING count(*) > 1
      ORDER BY 2 DESC
      LIMIT ${INSIGHT_LIST_LIMIT}
    `),
  ]);

  // Days with no reports are the point of a trend line, so the gaps get filled
  // rather than compressed away.
  const byDay = new Map(
    perDayRows.map((row) => [
      row.day.toISOString().slice(0, 10),
      { reports: num(row.reports), openReports: num(row.open_reports) },
    ]),
  );
  const perDay: ModerationInsights["perDay"] = [];
  for (let offset = 0; offset < input.days; offset += 1) {
    const date = new Date(since.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
    const hit = byDay.get(date);
    perDay.push({ date, reports: hit?.reports ?? 0, openReports: hit?.openReports ?? 0 });
  }

  const counts = perDay.map((point) => point.reports);
  const busiest = perDay.reduce<ModerationInsights["perDay"][number] | null>(
    (top, point) => (top === null || point.reports > top.reports ? point : top),
    null,
  );
  const totalInWindow = counts.reduce((sum, value) => sum + value, 0);
  const openInWindow = perDay.reduce((sum, point) => sum + point.openReports, 0);

  return {
    days: input.days,
    totalInWindow,
    openInWindow,
    actionedInWindow: totalInWindow - openInWindow,
    medianPerDay: Math.round(median(counts) * 10) / 10,
    busiestDate: busiest && busiest.reports > 0 ? busiest.date : null,
    busiestCount: busiest?.reports ?? 0,
    perDay,
    // Rows whose reason predates the current enum normalize to "other", so the
    // buckets have to be merged after parsing or "Other" appears twice.
    byReason: [
      ...reasonRows
        .reduce((buckets, row) => {
          const parsed = abuseReportReasonSchema.safeParse(row.reason);
          const reason = parsed.success ? parsed.data : ("other" as AbuseReportReason);
          const current = buckets.get(reason) ?? { reason, reports: 0, openReports: 0 };
          current.reports += num(row.reports);
          current.openReports += num(row.open_reports);
          buckets.set(reason, current);
          return buckets;
        }, new Map<AbuseReportReason, ModerationInsights["byReason"][number]>())
        .values(),
    ].sort((a, b) => b.reports - a.reports),
    repeatTargets: targetRows.map((row) => ({
      username: row.username,
      kyteId: row.kyte_id,
      orgId: row.org_id,
      ownerEmail: row.owner_email,
      reports: num(row.reports),
      openReports: num(row.open_reports),
      reporters: num(row.reporters),
      moderationStatus: row.moderation_status,
      lastReportedAt: isoRequired(row.last_reported_at),
    })),
    ownerDomains: domainRows.map((row) => ({
      domain: row.domain,
      reports: num(row.reports),
      accounts: num(row.accounts),
      suspendedAccounts: num(row.suspended_accounts),
    })),
    reporters: reporterRows.map((row) => ({
      // Only ever a prefix: enough to tell two reporters apart in the UI,
      // never enough to be a stable identifier on its own.
      fingerprint: row.ip_hash.slice(0, 8),
      reports: num(row.reports),
      targets: num(row.targets),
      dismissed: num(row.dismissed),
    })),
  };
}
