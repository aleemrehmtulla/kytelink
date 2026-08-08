import Link from "next/link";
import { StatusPill, UserStatusPill } from "../../ui/status-pill";
import { formatDateTimeFull, formatPercent, formatRelativeTime } from "../../../lib/format";
import type { SuspendedRow } from "../../../lib/admin-source";
import { SignalPills } from "./evidence";
import { SUSPENSION_SCOPE_LABELS, SUSPENSION_SOURCE_LABELS, plural } from "./moderation-copy";
import { truncate } from "./moderation-text";

const REASON_MAX = 220;

export interface SuspendedRowBodyProps {
  row: SuspendedRow;
  note?: string;
}

export function SuspendedRowBody({ row, note }: SuspendedRowBodyProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 whitespace-normal text-left font-normal">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link
          href={`/orgs/${row.orgId}/${row.kyteId}`}
          className="cursor-pointer text-[13px] font-semibold text-accent hover:text-accent-hover"
        >
          {row.username ? `@${row.username}` : "Kyte without a username"}
        </Link>
        {row.displayName ? (
          <span className="truncate text-[13px] text-tertiary">{row.displayName}</span>
        ) : null}
        <StatusPill label={SUSPENSION_SCOPE_LABELS[row.scope]} tone="warning" />
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] text-tertiary">
          Owner <UserStatusPill status={row.userStatus} />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-tertiary">
        {row.userId ? (
          <Link
            href={`/users/${row.userId}`}
            className="cursor-pointer truncate text-secondary hover:text-ink"
          >
            {row.email}
          </Link>
        ) : (
          <span className="truncate text-secondary">{row.email}</span>
        )}
        <span aria-hidden="true">·</span>
        <span title={formatDateTimeFull(row.suspendedAt)}>
          {formatRelativeTime(row.suspendedAt)}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {row.reviewedBy ?? "Automated"} <span className="text-faint">({SUSPENSION_SOURCE_LABELS[row.source]})</span>
        </span>
        {row.reportCount > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className={row.reportCount > 1 ? "font-medium text-ink" : undefined}>
              {row.reportCount} {plural(row.reportCount, "report")}
            </span>
          </>
        ) : null}
      </div>

      {row.scope === "org" ? (
        <p className="text-[12px] text-tertiary">
          Down because its org is suspended — restore the org to bring it back.
        </p>
      ) : null}

      <p className="text-[13px] leading-relaxed text-secondary" title={row.reasonOrNote}>
        {truncate(row.reasonOrNote, REASON_MAX)}
        {row.confidence !== null ? (
          <span className="ml-2 text-[12px] tabular-nums text-tertiary">
            confidence {formatPercent(row.confidence)}
          </span>
        ) : null}
      </p>

      <SignalPills signals={row.signals} />

      {note ? <p className="text-[12px] font-medium text-success">{note}</p> : null}
    </div>
  );
}
