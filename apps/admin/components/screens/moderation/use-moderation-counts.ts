import { useCallback } from "react";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";

/**
 * The strip only reports numbers the contract actually returns. The 24h count is
 * derived from the most recent RECENT_SAMPLE suspensions, so it is reported as
 * saturated ("100+") rather than guessed once the sample fills up.
 */
const RECENT_SAMPLE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ModerationCounts {
  openReports: number;
  oldestOpenAgeMs: number | null;
  offlineKytes: number;
  suspendedLast24h: number;
  suspendedLast24hSaturated: boolean;
  suspendedAccounts: number;
  openAppeals: number;
}

export function useModerationCounts() {
  const source = useAdminSource();

  const fetchCounts = useCallback(async (): Promise<ModerationCounts> => {
    const [openReports, recentlyOffline, suspendedAccounts, openAppeals] = await Promise.all([
      source.abuseReports({ status: "OPEN", sort: "createdAt", dir: "asc", page: 1, pageSize: 10 }),
      source.suspendedList({ sort: "suspendedAt", dir: "desc", page: 1, pageSize: RECENT_SAMPLE }),
      source.searchUsers({ status: "SUSPENDED", page: 1, pageSize: 10 }),
      source.appeals({ status: "OPEN", page: 1, pageSize: 10 }),
    ]);

    const now = Date.now();
    const cutoff = now - DAY_MS;
    const last24h = recentlyOffline.rows.filter(
      (row) => new Date(row.suspendedAt).getTime() >= cutoff,
    ).length;
    const oldestOpenAt = openReports.rows[0]?.createdAt;

    return {
      openReports: openReports.total,
      oldestOpenAgeMs:
        oldestOpenAt === undefined ? null : Math.max(0, now - new Date(oldestOpenAt).getTime()),
      offlineKytes: recentlyOffline.total,
      suspendedLast24h: last24h,
      suspendedLast24hSaturated: last24h >= RECENT_SAMPLE,
      suspendedAccounts: suspendedAccounts.total,
      openAppeals: openAppeals.total,
    };
  }, [source]);

  return useAsync(fetchCounts);
}
