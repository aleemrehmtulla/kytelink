import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { KyteModerationHistoryRow, KytePublishHistoryRow } from "../../../lib/admin-source";

const VERDICT_LABELS = { APPROVE: "Approved", SUSPEND: "Suspended" } as const;
const VERDICT_DOTS = { APPROVE: "bg-success", SUSPEND: "bg-warning" } as const;

function reviewer(entry: KyteModerationHistoryRow): string {
  if (entry.reviewedBy) return entry.reviewedBy;
  if (entry.provider === "manual") return "an admin";
  return `Automated (${entry.provider})`;
}

export function KyteModerationTimeline({
  entries: unordered,
}: {
  entries: KyteModerationHistoryRow[];
}) {
  if (unordered.length === 0) {
    return (
      <p className="text-[13px] text-tertiary">
        Nothing has been reviewed yet — this page has never been actioned.
      </p>
    );
  }

  const entries = [...unordered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="flex gap-3">
          <span className="flex flex-col items-center pt-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-pill ${VERDICT_DOTS[entry.verdict]}`}
              aria-hidden="true"
            />
            {index < entries.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-hairline" aria-hidden="true" />
            ) : null}
          </span>
          <div className={`min-w-0 flex-1 ${index < entries.length - 1 ? "pb-4" : ""}`}>
            <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <span className="font-medium text-ink">{VERDICT_LABELS[entry.verdict]}</span>
              <span className="text-tertiary">by {reviewer(entry)}</span>
              <span className="text-faint" title={formatDateTimeFull(entry.createdAt)}>
                {formatRelativeTime(entry.createdAt)}
              </span>
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-secondary">{entry.reason}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function KytePublishTimeline({
  entries: unordered,
}: {
  entries: KytePublishHistoryRow[];
}) {
  if (unordered.length === 0) {
    return <p className="text-[13px] text-tertiary">Never published.</p>;
  }

  const entries = [...unordered].sort((a, b) => b.seq - a.seq);

  return (
    <ol className="flex flex-col gap-2 text-[13px]">
      {entries.map((entry) => (
        <li
          key={entry.seq}
          className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-hairline pt-2 first:border-0 first:pt-0"
        >
          <span className="text-ink">
            Publish #{entry.seq}
            {entry.scheduled ? <span className="text-tertiary"> · scheduled</span> : null}
          </span>
          <span className="text-tertiary" title={formatDateTimeFull(entry.publishedAt)}>
            {formatRelativeTime(entry.publishedAt)}
          </span>
        </li>
      ))}
    </ol>
  );
}
