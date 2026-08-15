import { useCallback } from "react";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";

export interface ModerationCounts {
  openReports: number;
  oldestOpenAgeMs: number | null;
  offlineKytes: number;
  suspendedLast24h: number;
  suspendedAccounts: number;
  openAppeals: number;
}

export function useModerationCounts() {
  const source = useAdminSource();

  const fetchCounts = useCallback(async (): Promise<ModerationCounts> => {
    const counts = await source.moderationCounts();
    return {
      openReports: counts.openReports,
      oldestOpenAgeMs:
        counts.oldestOpenReportAt === null
          ? null
          : Math.max(0, Date.now() - new Date(counts.oldestOpenReportAt).getTime()),
      offlineKytes: counts.offlineKytes,
      suspendedLast24h: counts.suspendedLast24h,
      suspendedAccounts: counts.suspendedAccounts,
      openAppeals: counts.openAppeals,
    };
  }, [source]);

  return useAsync(fetchCounts);
}
