import type { ReactNode } from "react";
import { StatGroup, type StatItem } from "../../ui/stat-group";
import { formatNumber } from "../../../lib/format";
import { formatDuration } from "./moderation-text";
import type { ModerationCounts } from "./use-moderation-counts";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const LABELS = [
  "Open reports",
  "Open appeals",
  "Suspended (24h)",
  "Kytes offline",
  "Accounts suspended",
] as const;

export interface QueueHealthProps {
  counts: ModerationCounts | undefined;
  status: "loading" | "success" | "error";
}

function item(key: string, label: string, value: ReactNode, sub?: ReactNode): StatItem {
  return { key, label, value, sub };
}

export function QueueHealth({ counts, status }: QueueHealthProps) {
  // Pending counts render the finished group with em-dashes, so the numbers
  // land without the row changing height.
  if (!counts) {
    if (status === "error") return null;
    return (
      <div className="mb-4" role="status" aria-label="Loading queue health">
        <StatGroup
          columns={5}
          size="compact"
          items={LABELS.map((label) => item(label, label, <span className="text-ghost">—</span>))}
        />
      </div>
    );
  }

  const oldestMs = counts.oldestOpenAgeMs;
  const stale = oldestMs !== null && oldestMs > STALE_AFTER_MS;

  return (
    <div className={`mb-4 ${status === "loading" ? "opacity-60" : ""}`}>
      <StatGroup
        columns={5}
        size="compact"
        items={[
          item(
            "open",
            LABELS[0],
            formatNumber(counts.openReports),
            oldestMs === null ? (
              "clear"
            ) : (
              <span className={stale ? "text-danger font-medium" : undefined}>
                oldest {formatDuration(oldestMs)}
              </span>
            ),
          ),
          {
            ...item(
              "appeals",
              LABELS[1],
              formatNumber(counts.openAppeals),
              counts.openAppeals === 0 ? "none waiting" : "waiting on a reply",
            ),
            href: "/moderation/appeals",
            tone: counts.openAppeals > 0 ? "warning" : "default",
          },
          item(
            "suspended-24h",
            LABELS[2],
            counts.suspendedLast24hSaturated
              ? `${formatNumber(counts.suspendedLast24h)}+`
              : formatNumber(counts.suspendedLast24h),
            counts.suspendedLast24hSaturated ? "of the last 100" : "today",
          ),
          item("offline", LABELS[3], formatNumber(counts.offlineKytes), "kyte or org"),
          item("accounts", LABELS[4], formatNumber(counts.suspendedAccounts), "read-only"),
        ]}
      />
    </div>
  );
}
