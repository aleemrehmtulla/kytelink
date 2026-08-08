import Link from "next/link";
import { useState } from "react";
import { ACCENT } from "@kytelink/ui";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { ExportDialog } from "../../ui/export-dialog";
import { LoadingState } from "../../ui/loading-state";
import {
  formatCompactNumber,
  formatNumber,
  nonBlank,
} from "../../../lib/format";
import type { AsyncStatus } from "../../../hooks/use-async";
import type { TopKyteRow } from "../../../lib/admin-source";
import type { Granularity } from "./use-traffic-range";

export interface TopKytesCardProps {
  /** Defaults to the traffic page's wording; Live re-uses the card verbatim. */
  title?: string;
  emptyDescription?: string;
  rows: TopKyteRow[] | undefined;
  status: AsyncStatus;
  onRetry: () => void;
  filters: { from: string; to: string; granularity: Granularity; limit: number };
  rangeLabel: string;
}

function kyteLabel(row: TopKyteRow): string {
  if (row.username) return `@${row.username}`;
  if (row.displayName) return row.displayName;
  return "Unnamed kyte";
}

export function TopKytesCard({
  title = "Top kytes by views",
  emptyDescription = "Widen the range or check that beacons are reaching the API.",
  rows,
  status,
  onRetry,
  filters,
  rangeLabel,
}: TopKytesCardProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const list = rows ?? [];
  const totalViews = list.reduce((acc, row) => acc + row.views, 0);
  const peak = list.reduce((acc, row) => Math.max(acc, row.views), 0) || 1;

  return (
    <Card
      title={title}
      action={
        <Button
          tone="secondary"
          size="sm"
          onClick={() => setExportOpen(true)}
          disabled={status !== "success" || list.length === 0}
        >
          Export
        </Button>
      }
    >
      {status === "loading" && !rows ? (
        <LoadingState rows={6} />
      ) : status === "error" && !rows ? (
        <ErrorState message="Couldn't load top kytes." onRetry={onRetry} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No kyte got a view in this window"
          description={emptyDescription}
        />
      ) : (
        <>
          <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
            {formatCompactNumber(totalViews)} views across {formatNumber(list.length)}{" "}
            {list.length === 1 ? "kyte" : "kytes"}
          </p>
          <ul className="flex flex-col gap-2.5">
            {list.map((row, index) => (
              <li key={row.kyteId}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="text-faint w-4 shrink-0 tabular-nums">
                      {index + 1}
                    </span>
                    <Link
                      href={`/orgs/${row.orgId}/${row.kyteId}`}
                      className="text-ink hover:text-accent truncate"
                      title={nonBlank(row.displayName) ?? kyteLabel(row)}
                    >
                      {kyteLabel(row)}
                    </Link>
                  </span>
                  <span className="text-tertiary shrink-0 tabular-nums">
                    <span className="text-ink font-semibold">
                      {formatNumber(row.views)}
                    </span>{" "}
                    views · {formatNumber(row.clicks)} clicks
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={row.views}
                  aria-valuemin={0}
                  aria-valuemax={peak}
                  aria-label={`${kyteLabel(row)}: ${formatNumber(row.views)} views, ${formatNumber(row.clicks)} clicks`}
                  className="rounded-pill bg-tint-hover mt-1.5 h-2"
                >
                  <div
                    className="rounded-pill h-2"
                    style={{
                      width: `${Math.max(2, (row.views / peak) * 100)}%`,
                      background: ACCENT,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="topKytes"
        filters={filters}
        title="Export top kytes"
        scopeDescription={`Top ${formatNumber(list.length)} kytes by views, ${rangeLabel}`}
      />
    </Card>
  );
}
