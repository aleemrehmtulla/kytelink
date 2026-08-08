import { useCallback, useMemo } from "react";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { TopKytesCard } from "../traffic/top-kytes-card";

const HOUR_MS = 3_600_000;

/**
 * "Which pages is that traffic actually on?" — the question the per-minute
 * chart raises and can't answer. Pinned to a whole hour so the window is
 * stable between polls instead of shifting under the reader every 5 seconds.
 */
export function LiveTopKytes() {
  const source = useAdminSource();
  const range = useMemo(() => {
    const to = new Date();
    to.setMinutes(0, 0, 0);
    return {
      from: new Date(to.getTime() - HOUR_MS).toISOString(),
      to: new Date(to.getTime() + HOUR_MS).toISOString(),
      granularity: "hour" as const,
      limit: 10,
    };
  }, []);

  const fetchTop = useCallback(() => source.topKytes(range), [source, range]);
  const { data, status, reload } = useAsync(fetchTop);

  return (
    <TopKytesCard
      title="Busiest pages this hour"
      rows={data?.kytes}
      status={status}
      onRetry={reload}
      filters={range}
      emptyDescription="Nothing has been viewed this hour yet."
      rangeLabel="the current hour"
    />
  );
}
