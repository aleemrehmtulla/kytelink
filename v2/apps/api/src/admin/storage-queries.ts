import { Prisma, type PrismaClient } from "@kytelink/db";
import { TRPCError } from "@trpc/server";
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
  sortDir,
  totalOf,
} from "./admin-sql";

export type StorageAssetKind = "image" | "avatar" | "og";

const KIND_TO_ENUM: Record<StorageAssetKind, string> = {
  image: "LINK_IMAGE",
  avatar: "AVATAR",
  og: "OG_IMAGE",
};

export function storageKindOf(kind: string): StorageAssetKind {
  if (kind === "AVATAR") return "avatar";
  if (kind === "OG_IMAGE") return "og";
  return "image";
}

/**
 * An asset is orphaned when nothing the kyte can serve still references it.
 *
 * The previous rule ("LINK_IMAGE on a kyte with no avatar") was simply wrong —
 * a link image has nothing to do with the avatar slot, so it both flagged live
 * images and missed dead ones. The real test is reachability:
 *   AVATAR      — not the draft's and not the published avatar asset.
 *   LINK_IMAGE  — its storage key appears in neither the draft nor the published
 *                 links/icons JSON (the editor stores the CDN URL, which embeds
 *                 the key, inside the link's emoji field).
 *   OG_IMAGE    — never orphaned: the OG worker deletes the previous object when
 *                 it writes a new one, so the surviving row is always the live one.
 */
const ORPHANED_SQL = Prisma.sql`(
  CASE a.kind
    WHEN 'OG_IMAGE' THEN FALSE
    WHEN 'AVATAR' THEN
      COALESCE(k."avatarAssetId", '') <> a.id AND COALESCE(p."avatarAssetId", '') <> a.id
    ELSE
      position(a.key IN concat(
        k.links::text, k.icons::text,
        COALESCE(p.links::text, ''), COALESCE(p.icons::text, '')
      )) = 0
  END
)`;

const ASSET_JOINS = Prisma.sql`
  JOIN "Kyte" k ON k.id = a."kyteId"
  LEFT JOIN "PublishedKyte" p ON p."kyteId" = k.id
`;

export interface StorageOverview {
  bucketTotalBytes: number;
  assetCount: number;
  orgsWithStorage: number;
  medianOrgBytes: number;
  p95OrgBytes: number;
  topTenSharePct: number;
  orphanedBytes: number;
  orphanedCount: number;
  growthSeries: { date: string; bytes: number }[];
}

export async function storageOverview(db: PrismaClient): Promise<StorageOverview> {
  const [totals, orphans, growth] = await Promise.all([
    db.$queryRaw<
      {
        bucket_total: bigint | null;
        asset_count: number;
        orgs_with_storage: number;
        median_bytes: number | null;
        p95_bytes: number | null;
        top_ten_bytes: bigint | null;
      }[]
    >(Prisma.sql`
      WITH per_org AS (
        SELECT k."orgId" AS org_id, sum(a."sizeBytes")::bigint AS bytes, count(*)::int AS assets
        FROM "Asset" a JOIN "Kyte" k ON k.id = a."kyteId"
        GROUP BY k."orgId"
      ),
      top_ten AS (SELECT bytes FROM per_org ORDER BY bytes DESC LIMIT 10)
      SELECT
        COALESCE((SELECT sum(bytes) FROM per_org), 0)::bigint AS bucket_total,
        COALESCE((SELECT sum(assets) FROM per_org), 0)::int AS asset_count,
        (SELECT count(*) FROM per_org WHERE bytes > 0)::int AS orgs_with_storage,
        (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY bytes) FROM per_org) AS median_bytes,
        (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY bytes) FROM per_org) AS p95_bytes,
        COALESCE((SELECT sum(bytes) FROM top_ten), 0)::bigint AS top_ten_bytes
    `),
    db.$queryRaw<{ orphan_count: number; orphan_bytes: bigint | null }[]>(Prisma.sql`
      SELECT count(*)::int AS orphan_count, COALESCE(sum(a."sizeBytes"), 0)::bigint AS orphan_bytes
      FROM "Asset" a ${ASSET_JOINS}
      WHERE ${ORPHANED_SQL}
    `),
    // One pass over Asset, then a running window sum — not 30 correlated scans.
    db.$queryRaw<{ date: string; bytes: bigint | null }[]>(Prisma.sql`
      WITH per_day AS (
        SELECT (a."createdAt" AT TIME ZONE 'UTC')::date AS day, sum(a."sizeBytes")::bigint AS bytes
        FROM "Asset" a GROUP BY 1
      ),
      window_start AS (SELECT ((now() AT TIME ZONE 'UTC')::date - INTERVAL '29 days')::date AS d),
      base AS (
        SELECT COALESCE(sum(pd.bytes), 0)::bigint AS bytes
        FROM per_day pd, window_start ws WHERE pd.day < ws.d
      ),
      days AS (
        SELECT generate_series(
          (SELECT d FROM window_start), (now() AT TIME ZONE 'UTC')::date, INTERVAL '1 day'
        )::date AS day
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             ((SELECT bytes FROM base)
               + COALESCE(sum(COALESCE(pd.bytes, 0)) OVER (ORDER BY d.day), 0))::bigint AS bytes
      FROM days d LEFT JOIN per_day pd ON pd.day = d.day
      ORDER BY d.day
    `),
  ]);

  const row = totals[0];
  const bucketTotalBytes = num(row?.bucket_total);
  const topTenBytes = num(row?.top_ten_bytes);

  return {
    bucketTotalBytes,
    assetCount: num(row?.asset_count),
    orgsWithStorage: num(row?.orgs_with_storage),
    medianOrgBytes: Math.round(num(row?.median_bytes)),
    p95OrgBytes: Math.round(num(row?.p95_bytes)),
    topTenSharePct:
      bucketTotalBytes === 0 ? 0 : Math.round((topTenBytes / bucketTotalBytes) * 1000) / 10,
    orphanedBytes: num(orphans[0]?.orphan_bytes),
    orphanedCount: num(orphans[0]?.orphan_count),
    growthSeries: growth.map((point) => ({ date: point.date, bytes: num(point.bytes) })),
  };
}

export interface StorageOrgRow {
  orgId: string;
  orgName: string;
  ownerUserId: string | null;
  ownerEmail: string;
  kyteCount: number;
  assetCount: number;
  bytes: number;
  limitBytes: number | null;
  pctOfLimit: number | null;
  pctOfTotal: number;
  largestAssetBytes: number;
  lastUploadAt: string | null;
}

export interface StorageOrgsInput extends PageInput {
  query: string;
  sort: "bytes" | "assetCount" | "pctOfLimit" | "orgName";
  dir: "asc" | "desc";
  overLimitOnly: boolean;
}

const OWNER_CTE = Prisma.sql`
  owner AS (
    SELECT DISTINCT ON (om."orgId") om."orgId" AS org_id, om."userId" AS owner_user_id, u.email
    FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"
    WHERE om.role = 'OWNER'
    ORDER BY om."orgId", om."createdAt" ASC, om."userId" ASC
  )
`;

export async function storageOrgs(
  db: PrismaClient,
  input: StorageOrgsInput,
): Promise<PagedResult<StorageOrgRow>> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [];
  const needle = input.query.trim();
  if (needle) {
    conditions.push(
      Prisma.sql`(o.name ILIKE ${likeNeedle(needle)} ESCAPE '\\' OR o.id = ${needle}
        OR EXISTS (
          SELECT 1 FROM "OrgMember" om2 JOIN "User" u2 ON u2.id = om2."userId"
          WHERE om2."orgId" = o.id AND u2.email ILIKE ${likeNeedle(needle)} ESCAPE '\\'
        ))`,
    );
  }

  const sortExpr =
    input.sort === "orgName"
      ? Prisma.sql`org_name`
      : input.sort === "assetCount"
        ? Prisma.sql`asset_count`
        : input.sort === "pctOfLimit"
          ? Prisma.sql`pct_of_limit`
          : Prisma.sql`bytes`;

  const rows = await db.$queryRaw<
    {
      org_id: string;
      org_name: string;
      owner_user_id: string | null;
      owner_email: string | null;
      kyte_count: number;
      asset_count: number;
      bytes: bigint | null;
      limit_bytes: bigint | null;
      pct_of_limit: number | null;
      largest_asset: number | null;
      last_upload_at: Date | null;
      grand_total: bigint | null;
      total: number;
    }[]
  >(Prisma.sql`
    WITH filtered AS (
      SELECT o.id, o.name, o."maxStorageBytes" FROM "Organization" o WHERE ${andWhere(conditions)}
    ),
    ${OWNER_CTE},
    kytes AS (
      SELECT k."orgId" AS org_id, count(*)::int AS kyte_count FROM "Kyte" k
      WHERE k."orgId" IN (SELECT id FROM filtered) GROUP BY k."orgId"
    ),
    assets AS (
      SELECT k."orgId" AS org_id,
             sum(a."sizeBytes")::bigint AS bytes,
             count(*)::int AS asset_count,
             max(a."sizeBytes")::int AS largest_asset,
             max(a."createdAt") AS last_upload_at
      FROM "Asset" a JOIN "Kyte" k ON k.id = a."kyteId"
      WHERE k."orgId" IN (SELECT id FROM filtered)
      GROUP BY k."orgId"
    ),
    grand AS (SELECT COALESCE(sum(a."sizeBytes"), 0)::bigint AS bytes FROM "Asset" a)
    SELECT f.id AS org_id, f.name AS org_name,
           ow.owner_user_id, ow.email AS owner_email,
           COALESCE(kt.kyte_count, 0) AS kyte_count,
           COALESCE(ast.asset_count, 0) AS asset_count,
           COALESCE(ast.bytes, 0) AS bytes,
           f."maxStorageBytes" AS limit_bytes,
           CASE WHEN f."maxStorageBytes" IS NULL OR f."maxStorageBytes" = 0 THEN NULL
                ELSE round((COALESCE(ast.bytes, 0)::numeric / f."maxStorageBytes"::numeric) * 100, 1)
           END AS pct_of_limit,
           COALESCE(ast.largest_asset, 0) AS largest_asset,
           ast.last_upload_at,
           (SELECT bytes FROM grand) AS grand_total,
           (count(*) OVER ())::int AS total
    FROM filtered f
    LEFT JOIN owner ow ON ow.org_id = f.id
    LEFT JOIN kytes kt ON kt.org_id = f.id
    LEFT JOIN assets ast ON ast.org_id = f.id
    WHERE ${
      input.overLimitOnly
        ? Prisma.sql`f."maxStorageBytes" IS NOT NULL AND f."maxStorageBytes" > 0
            AND COALESCE(ast.bytes, 0) > f."maxStorageBytes"`
        : Prisma.sql`TRUE`
    }
    ORDER BY ${sortExpr} ${sortDir(input.dir)} NULLS LAST, f.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const grandTotal = num(rows[0]?.grand_total);
  return paged(
    rows.map((row) => ({
      orgId: row.org_id,
      orgName: row.org_name,
      ownerUserId: row.owner_user_id,
      ownerEmail: row.owner_email ?? "",
      kyteCount: num(row.kyte_count),
      assetCount: num(row.asset_count),
      bytes: num(row.bytes),
      limitBytes: row.limit_bytes === null ? null : num(row.limit_bytes),
      pctOfLimit: row.pct_of_limit === null ? null : num(row.pct_of_limit),
      pctOfTotal:
        grandTotal === 0 ? 0 : Math.round((num(row.bytes) / grandTotal) * 1000) / 10,
      largestAssetBytes: num(row.largest_asset),
      lastUploadAt: iso(row.last_upload_at),
    })),
    totalOf(rows),
    input,
  );
}

interface StorageFileRow {
  assetId: string;
  kyteId: string;
  kyteUsername: string | null;
  kind: StorageAssetKind;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploaderEmail: string | null;
  orphaned: boolean;
}

export interface StorageOrgFilesInput extends PageInput {
  orgId: string;
  kyteId?: string;
  kind?: StorageAssetKind;
  sort: "sizeBytes" | "createdAt";
  dir: "asc" | "desc";
}

export interface StorageOrgFilesResult extends PagedResult<StorageFileRow> {
  org: {
    orgId: string;
    orgName: string;
    ownerUserId: string | null;
    ownerEmail: string;
    totalBytes: number;
    limitBytes: number | null;
    assetCount: number;
    kyteCount: number;
  };
}

export async function storageOrgFiles(
  db: PrismaClient,
  input: StorageOrgFilesInput,
): Promise<StorageOrgFilesResult> {
  const { limit, offset } = pageWindow(input);
  const conditions: Prisma.Sql[] = [Prisma.sql`(k."orgId" = ${input.orgId})`];
  if (input.kyteId) conditions.push(Prisma.sql`(a."kyteId" = ${input.kyteId})`);
  if (input.kind) {
    conditions.push(Prisma.sql`(a.kind = ${KIND_TO_ENUM[input.kind]}::"AssetKind")`);
  }
  const sortExpr =
    input.sort === "createdAt" ? Prisma.sql`a."createdAt"` : Prisma.sql`a."sizeBytes"`;

  const [rows, header] = await Promise.all([
    db.$queryRaw<
      {
        asset_id: string;
        kyte_id: string;
        kyte_username: string | null;
        kind: string;
        content_type: string;
        size_bytes: number;
        width: number | null;
        height: number | null;
        created_at: Date;
        uploader_email: string | null;
        orphaned: boolean;
        total: number;
      }[]
    >(Prisma.sql`
      SELECT a.id AS asset_id, a."kyteId" AS kyte_id, k.username AS kyte_username,
             a.kind::text AS kind, a."contentType" AS content_type, a."sizeBytes" AS size_bytes,
             a.width, a.height, a."createdAt" AS created_at,
             up.email AS uploader_email,
             ${ORPHANED_SQL} AS orphaned,
             (count(*) OVER ())::int AS total
      FROM "Asset" a ${ASSET_JOINS}
      LEFT JOIN "User" up ON up.id = a."uploadedById"
      WHERE ${andWhere(conditions)}
      ORDER BY ${sortExpr} ${sortDir(input.dir)}, a.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.$queryRaw<
      {
        org_id: string;
        org_name: string;
        owner_user_id: string | null;
        owner_email: string | null;
        total_bytes: bigint | null;
        limit_bytes: bigint | null;
        asset_count: number;
        kyte_count: number;
      }[]
    >(Prisma.sql`
      WITH filtered AS (SELECT o.id, o.name, o."maxStorageBytes" FROM "Organization" o WHERE o.id = ${input.orgId}),
      ${OWNER_CTE}
      SELECT f.id AS org_id, f.name AS org_name, ow.owner_user_id, ow.email AS owner_email,
             COALESCE((
               SELECT sum(a."sizeBytes")::bigint FROM "Asset" a
               JOIN "Kyte" k ON k.id = a."kyteId" WHERE k."orgId" = f.id
             ), 0)::bigint AS total_bytes,
             f."maxStorageBytes" AS limit_bytes,
             COALESCE((
               SELECT count(*)::int FROM "Asset" a
               JOIN "Kyte" k ON k.id = a."kyteId" WHERE k."orgId" = f.id
             ), 0) AS asset_count,
             (SELECT count(*)::int FROM "Kyte" k WHERE k."orgId" = f.id) AS kyte_count
      FROM filtered f LEFT JOIN owner ow ON ow.org_id = f.id
    `),
  ]);

  const org = header[0];
  if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });

  return {
    ...paged(rows.map(storageFileRow), totalOf(rows), input),
    org: {
      orgId: org.org_id,
      orgName: org.org_name,
      ownerUserId: org.owner_user_id,
      ownerEmail: org.owner_email ?? "",
      totalBytes: num(org.total_bytes),
      limitBytes: org.limit_bytes === null ? null : num(org.limit_bytes),
      assetCount: num(org.asset_count),
      kyteCount: num(org.kyte_count),
    },
  };
}

function storageFileRow(row: {
  asset_id: string;
  kyte_id: string;
  kyte_username: string | null;
  kind: string;
  content_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: Date;
  uploader_email: string | null;
  orphaned: boolean;
}): StorageFileRow {
  return {
    assetId: row.asset_id,
    kyteId: row.kyte_id,
    kyteUsername: row.kyte_username,
    kind: storageKindOf(row.kind),
    contentType: row.content_type,
    sizeBytes: num(row.size_bytes),
    width: row.width,
    height: row.height,
    createdAt: isoRequired(row.created_at),
    uploaderEmail: row.uploader_email,
    orphaned: row.orphaned,
  };
}

export interface StorageOrphanRow {
  assetId: string;
  kyteId: string;
  kyteUsername: string | null;
  orgId: string;
  orgName: string;
  sizeBytes: number;
  createdAt: string;
}

export async function storageOrphans(
  db: PrismaClient,
  input: PageInput,
): Promise<PagedResult<StorageOrphanRow>> {
  const { limit, offset } = pageWindow(input);
  const rows = await db.$queryRaw<
    {
      asset_id: string;
      kyte_id: string;
      kyte_username: string | null;
      org_id: string;
      org_name: string;
      size_bytes: number;
      created_at: Date;
      total: number;
    }[]
  >(Prisma.sql`
    SELECT a.id AS asset_id, a."kyteId" AS kyte_id, k.username AS kyte_username,
           k."orgId" AS org_id, o.name AS org_name,
           a."sizeBytes" AS size_bytes, a."createdAt" AS created_at,
           (count(*) OVER ())::int AS total
    FROM "Asset" a ${ASSET_JOINS}
    JOIN "Organization" o ON o.id = k."orgId"
    WHERE ${ORPHANED_SQL}
    ORDER BY a."sizeBytes" DESC, a.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return paged(
    rows.map((row) => ({
      assetId: row.asset_id,
      kyteId: row.kyte_id,
      kyteUsername: row.kyte_username,
      orgId: row.org_id,
      orgName: row.org_name,
      sizeBytes: num(row.size_bytes),
      createdAt: isoRequired(row.created_at),
    })),
    totalOf(rows),
    input,
  );
}
