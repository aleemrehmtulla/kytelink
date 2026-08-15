import type { PrismaClient } from "@kytelink/db";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import {
  abuseReportsInput,
  alertsInput,
  auditLogInput,
  orgKytesInput,
  orgMembersInput,
  searchOrgsInput,
  searchUsersInput,
  storageOrgFilesInput,
  storageOrgsInput,
  storageOrphansInput,
  suspendedListInput,
  topKytesInput,
  trafficRangeInput,
} from "@kytelink/trpc";
import type { exportDatasetEnum } from "@kytelink/trpc";
import * as queries from "./admin-queries";
import * as storage from "./storage-queries";
import { resolveRange, topKytes, trafficSeries } from "./traffic-queries";

export type ExportDataset = z.infer<typeof exportDatasetEnum>;

type ExportCell = string | number | boolean | null;

interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportResult {
  columns: ExportColumn[];
  rows: Record<string, ExportCell>[];
  total: number;
}

export interface ExportContext {
  db: PrismaClient;
  webBaseUrl: string;
  apiBaseUrl: string;
  limit: number;
}

type ObjectSchema = z.ZodType<Record<string, unknown>, unknown>;

/**
 * A stale admin client must never be able to 400 an export, so unparseable keys
 * are dropped and the schema's own defaults take over. A missing *required* key
 * (an orgId, a date range) is a real error and is reported as one.
 */
function lenientFilters<S extends ObjectSchema>(
  schema: S,
  raw: Record<string, unknown>,
): z.output<S> {
  const candidate: Record<string, unknown> = { ...raw };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const parsed = schema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    let dropped = false;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key in candidate) {
        delete candidate[key];
        dropped = true;
      }
    }
    if (!dropped) break;
  }
  const fallback = schema.safeParse({});
  if (fallback.success) return fallback.data;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "This export needs filters that the request did not include.",
  });
}

function columns(entries: [string, string][]): ExportColumn[] {
  return entries.map(([key, label]) => ({ key, label }));
}

function pick(row: object, cols: ExportColumn[]): Record<string, ExportCell> {
  const source = row as Record<string, unknown>;
  const out: Record<string, ExportCell> = {};
  for (const column of cols) {
    const value = source[column.key];
    out[column.key] =
      value === undefined || value === null
        ? null
        : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? value
          : String(value);
  }
  return out;
}

const USERS = columns([
  ["email", "Email"],
  ["name", "Name"],
  ["status", "Account status"],
  ["statusReason", "Status reason"],
  ["orgCount", "Organizations"],
  ["kyteCount", "Kytes owned"],
  ["storageBytes", "Storage (bytes)"],
  ["createdAt", "Signed up"],
  ["id", "User ID"],
]);

const ORGS = columns([
  ["name", "Organization"],
  ["ownerEmail", "Owner"],
  ["personal", "Personal"],
  ["memberCount", "People"],
  ["kyteCount", "Kytes"],
  ["publishedKyteCount", "Published kytes"],
  ["storageBytes", "Storage (bytes)"],
  ["storageLimitBytes", "Storage limit (bytes)"],
  ["createdAt", "Created"],
  ["id", "Organization ID"],
]);

const ORG_KYTES = columns([
  ["username", "Username"],
  ["displayName", "Display name"],
  ["published", "Published"],
  ["moderationStatus", "Moderation"],
  ["assetCount", "Files"],
  ["storageBytes", "Storage (bytes)"],
  ["createdAt", "Created"],
  ["id", "Kyte ID"],
]);

const ORG_MEMBERS = columns([
  ["email", "Email"],
  ["name", "Name"],
  ["role", "Role"],
  ["userStatus", "Account status"],
  ["joinedAt", "Joined"],
  ["userId", "User ID"],
]);

const SUSPENDED = columns([
  ["username", "Username"],
  ["displayName", "Display name"],
  ["email", "Owner"],
  ["userStatus", "Owner account status"],
  ["category", "Moderation"],
  ["source", "Source"],
  ["signalKeys", "Signals"],
  ["reasonOrNote", "Reason"],
  ["confidence", "Confidence"],
  ["reportCount", "Reports"],
  ["reviewedBy", "Reviewed by"],
  ["suspendedAt", "Suspended"],
  ["kyteId", "Kyte ID"],
]);

const REPORTS = columns([
  ["username", "Username"],
  ["ownerEmail", "Owner"],
  ["reason", "Reason"],
  ["details", "Details"],
  ["status", "Report status"],
  ["kyteModerationStatus", "Kyte moderation"],
  ["userStatus", "Owner account status"],
  ["reportCountForKyte", "Reports for kyte"],
  ["openedByAdmin", "Opened by an admin"],
  ["createdAt", "Reported"],
  ["reviewedAt", "Reviewed"],
  ["reviewedBy", "Reviewed by"],
  ["reportedUrl", "Reported URL"],
  ["id", "Report ID"],
]);

const AUDIT = columns([
  ["createdAt", "When"],
  ["action", "Action"],
  ["actorEmail", "Actor"],
  ["actorName", "Actor name"],
  ["isAdminAction", "Admin action"],
  ["summary", "Summary"],
  ["orgName", "Organization"],
  ["orgId", "Organization ID"],
  ["kyteId", "Kyte ID"],
  ["id", "Entry ID"],
]);

const STORAGE_ORGS = columns([
  ["orgName", "Organization"],
  ["ownerEmail", "Owner"],
  ["bytes", "Storage (bytes)"],
  ["limitBytes", "Limit (bytes)"],
  ["pctOfLimit", "Percent of limit"],
  ["pctOfTotal", "Percent of bucket"],
  ["assetCount", "Files"],
  ["kyteCount", "Kytes"],
  ["largestAssetBytes", "Largest file (bytes)"],
  ["lastUploadAt", "Last upload"],
  ["orgId", "Organization ID"],
]);

const STORAGE_FILES = columns([
  ["kyteUsername", "Username"],
  ["kind", "Kind"],
  ["contentType", "Content type"],
  ["sizeBytes", "Size (bytes)"],
  ["width", "Width"],
  ["height", "Height"],
  ["orphaned", "Orphaned"],
  ["uploaderEmail", "Uploaded by"],
  ["createdAt", "Uploaded"],
  ["assetId", "File ID"],
  ["kyteId", "Kyte ID"],
]);

const STORAGE_ORPHANS = columns([
  ["kyteUsername", "Username"],
  ["orgName", "Organization"],
  ["sizeBytes", "Size (bytes)"],
  ["createdAt", "Uploaded"],
  ["assetId", "File ID"],
  ["kyteId", "Kyte ID"],
  ["orgId", "Organization ID"],
]);

const ALERTS = columns([
  ["kind", "Kind"],
  ["message", "Message"],
  ["occurrences", "Occurrences"],
  ["createdAt", "First seen"],
  ["lastSeenAt", "Last seen"],
  ["resolvedAt", "Resolved"],
  ["resolvedBy", "Resolved by"],
  ["id", "Alert ID"],
]);

const TOP_KYTES = columns([
  ["username", "Username"],
  ["displayName", "Display name"],
  ["views", "Views"],
  ["clicks", "Clicks"],
  ["kyteId", "Kyte ID"],
  ["orgId", "Organization ID"],
]);

const TRAFFIC_SERIES = columns([
  ["bucket", "Bucket"],
  ["views", "Views"],
  ["clicks", "Clicks"],
  ["visitors", "Visitors"],
]);

const EXPORT_COLUMNS: Record<ExportDataset, ExportColumn[]> = {
  users: USERS,
  orgs: ORGS,
  orgKytes: ORG_KYTES,
  orgMembers: ORG_MEMBERS,
  suspended: SUSPENDED,
  reports: REPORTS,
  audit: AUDIT,
  storageOrgs: STORAGE_ORGS,
  storageFiles: STORAGE_FILES,
  storageOrphans: STORAGE_ORPHANS,
  alerts: ALERTS,
  topKytes: TOP_KYTES,
  trafficSeries: TRAFFIC_SERIES,
};

export async function exportRows(
  dataset: ExportDataset,
  filters: Record<string, unknown>,
  context: ExportContext,
): Promise<ExportResult> {
  const cols = EXPORT_COLUMNS[dataset];
  const page = { page: 1, pageSize: context.limit };

  switch (dataset) {
    case "users": {
      const result = await queries.searchUsers(context.db, {
        ...lenientFilters(searchUsersInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "orgs": {
      const result = await queries.searchOrgs(context.db, {
        ...lenientFilters(searchOrgsInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "orgKytes": {
      const result = await queries.orgKytes(context.db, {
        ...lenientFilters(orgKytesInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "orgMembers": {
      const result = await queries.orgMembers(context.db, {
        ...lenientFilters(orgMembersInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "suspended": {
      const result = await queries.suspendedList(context.db, {
        ...lenientFilters(suspendedListInput, filters),
        ...page,
      });
      return {
        columns: cols,
        rows: result.rows.map((row) =>
          pick({ ...row, signalKeys: row.signals.map((signal) => signal.key).join(", ") }, cols),
        ),
        total: result.total,
      };
    }
    case "reports": {
      const result = await queries.abuseReports(
        context.db,
        { ...lenientFilters(abuseReportsInput, filters), ...page },
        context.webBaseUrl,
      );
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "audit": {
      const result = await queries.auditLog(context.db, {
        ...lenientFilters(auditLogInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "storageOrgs": {
      const result = await storage.storageOrgs(context.db, {
        ...lenientFilters(storageOrgsInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "storageFiles": {
      const result = await storage.storageOrgFiles(
        context.db,
        {
          ...lenientFilters(storageOrgFilesInput, filters),
          ...page,
        },
        context.apiBaseUrl,
      );
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "storageOrphans": {
      const result = await storage.storageOrphans(context.db, {
        ...lenientFilters(storageOrphansInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "alerts": {
      const result = await queries.alerts(context.db, {
        ...lenientFilters(alertsInput, filters),
        ...page,
      });
      return { columns: cols, rows: result.rows.map((row) => pick(row, cols)), total: result.total };
    }
    case "topKytes": {
      const input = lenientFilters(topKytesInput, filters);
      const rows = await topKytes(context.db, resolveRange(input), context.limit);
      return { columns: cols, rows: rows.map((row) => pick(row, cols)), total: rows.length };
    }
    case "trafficSeries": {
      const input = lenientFilters(trafficRangeInput, filters);
      const result = await trafficSeries(resolveRange(input));
      return {
        columns: cols,
        rows: result.points.map((point) => pick(point, cols)),
        total: result.points.length,
      };
    }
  }
}
