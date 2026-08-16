import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "../../ui/status-pill";
import { ChevronDownGlyph } from "../../shell/icons";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { SuspendedRow } from "../../../lib/admin-source";
import { SignalPills } from "./evidence";
import { SUSPENSION_SCOPE_LABELS, plural } from "./moderation-copy";
import { truncate } from "./moderation-text";
import { ReviewMeta } from "./review-detail";

const REASON_MAX = 140;

export interface SuspendedRowBodyProps {
  row: SuspendedRow;
  note?: string;
}

export function SuspendedRowBody({ row, note }: SuspendedRowBodyProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-left font-normal whitespace-normal">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Link
          href={`/orgs/${row.orgId}/${row.kyteId}`}
          className="text-accent hover:text-accent-hover cursor-pointer text-[13px] font-semibold"
        >
          {row.username ? `@${row.username}` : "Kyte without a username"}
        </Link>
        {row.displayName ? (
          <span className="text-tertiary truncate text-[13px]">{row.displayName}</span>
        ) : null}
        <StatusPill label={SUSPENSION_SCOPE_LABELS[row.scope]} tone="warning" />
        {row.provider === "admin" && row.verdict === "SUSPEND" && row.reviewedBy ? (
          <StatusPill label="Upheld by admin" tone="success" />
        ) : null}
        {row.userStatus === "SUSPENDED" ? (
          <StatusPill label="Owner suspended" tone="danger" />
        ) : null}
        <span
          className="text-tertiary text-[12px]"
          title={formatDateTimeFull(row.suspendedAt)}
        >
          {formatRelativeTime(row.suspendedAt)}
        </span>
        {row.reportCount > 0 ? (
          <span className="rounded-pill bg-tint text-secondary px-2 py-0.5 text-[12px] tabular-nums">
            {row.reportCount} {plural(row.reportCount, "report")}
          </span>
        ) : null}
      </div>

      <p className="text-secondary text-[13px] leading-relaxed" title={row.reasonOrNote}>
        {truncate(row.reasonOrNote, REASON_MAX)}
        {row.scope === "org" ? (
          <span className="text-tertiary"> Restore the org to bring it back.</span>
        ) : null}
      </p>

      <div>
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          className="text-tertiary hover:text-ink inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium"
        >
          <ChevronDownGlyph className={`h-3 w-3 ${detailsOpen ? "" : "-rotate-90"}`} />
          {detailsOpen ? "Hide details" : "Details"}
        </button>
        {detailsOpen ? (
          <div className="border-hairline mt-2 flex flex-col gap-2 border-l-2 pl-3">
            {row.reasonOrNote.length > REASON_MAX ? (
              <p className="text-secondary text-[13px] leading-relaxed break-words">
                {row.reasonOrNote}
              </p>
            ) : null}
            <div className="text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              {row.userId ? (
                <Link
                  href={`/users/${row.userId}`}
                  className="text-secondary hover:text-ink cursor-pointer truncate"
                >
                  {row.email}
                </Link>
              ) : (
                <span className="text-secondary truncate">{row.email}</span>
              )}
              <span aria-hidden="true">·</span>
              <span>suspended {formatDateTimeFull(row.suspendedAt)}</span>
            </div>
            <ReviewMeta
              verdict={row.verdict}
              provider={row.provider}
              confidence={row.confidence}
              reviewedBy={row.reviewedBy}
              reviewedAt={row.reviewedAt}
              source={row.source}
            />
            <SignalPills signals={row.signals} />
          </div>
        ) : null}
      </div>

      {note ? <p className="text-success text-[12px] font-medium">{note}</p> : null}
    </div>
  );
}
