import type { ModerationStatus, ReportStatus, UserStatus } from "@kytelink/schemas";
import type { AbuseReportRow } from "../../../lib/admin-source";
import { nonBlank } from "../../../lib/format";

export interface ReportGroup {
  key: string;
  username: string | null;
  kyteId: string;
  orgId: string;
  userId: string | null;
  ownerEmail: string | null;
  reportedUrl: string;
  kyteModerationStatus: ModerationStatus | null;
  userStatus: UserStatus | null;
  reportCountForKyte: number;
  reports: AbuseReportRow[];
  openReports: AbuseReportRow[];
  newestAt: string;
  status: ReportStatus;
}

/**
 * Reports are paginated, usernames are not, so grouping is page-local: a kyte's
 * reports can straddle a page boundary. `reportCountForKyte` is the contract's
 * platform-wide count, which is what the UI quotes when the two disagree.
 */
export function groupReports(rows: AbuseReportRow[]): ReportGroup[] {
  const order: string[] = [];
  const groups = new Map<string, ReportGroup>();

  for (const row of rows) {
    const key = nonBlank(row.username) ?? nonBlank(row.kyteId) ?? row.id;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        username: row.username,
        kyteId: row.kyteId,
        orgId: row.orgId,
        userId: row.userId,
        ownerEmail: row.ownerEmail,
        reportedUrl: row.reportedUrl,
        kyteModerationStatus: row.kyteModerationStatus,
        userStatus: row.userStatus,
        reportCountForKyte: row.reportCountForKyte,
        reports: [],
        openReports: [],
        newestAt: row.createdAt,
        status: "DISMISSED",
      };
      groups.set(key, group);
      order.push(key);
    }
    group.reports.push(row);
    if (row.status === "OPEN") group.openReports.push(row);
    if (new Date(row.createdAt).getTime() > new Date(group.newestAt).getTime()) {
      group.newestAt = row.createdAt;
    }
    group.reportCountForKyte = Math.max(group.reportCountForKyte, row.reportCountForKyte);
  }

  for (const group of groups.values()) {
    group.status =
      group.openReports.length > 0
        ? "OPEN"
        : group.reports.some((report) => report.status === "ACTIONED")
          ? "ACTIONED"
          : "DISMISSED";
  }

  return order.flatMap((key) => {
    const group = groups.get(key);
    return group ? [group] : [];
  });
}
