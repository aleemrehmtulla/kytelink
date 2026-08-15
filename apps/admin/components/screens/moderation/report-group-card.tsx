import Link from "next/link";
import { Button } from "../../ui/button";
import { ModerationStatusPill, StatusPill, UserStatusPill } from "../../ui/status-pill";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import { CopyableUrl } from "./evidence";
import {
  ABUSE_REASON_LABELS,
  REPORT_STATUS_LABELS,
  plural,
} from "./moderation-copy";
import { truncate } from "./moderation-text";
import type { ReportGroup } from "./report-groups";
import { ViewPageLink } from "./view-page-link";

const PREVIEW_MAX = 180;
const DETAILS_MAX = 600;

const STATUS_TONE = { OPEN: "warning", ACTIONED: "success", DISMISSED: "neutral" } as const;

export interface ReportGroupCardProps {
  group: ReportGroup;
  expanded: boolean;
  onToggle: () => void;
  onAction: (kind: "suspend" | "dismiss") => void;
  busy: boolean;
  highlighted: boolean;
  note?: string;
}

export function ReportGroupCard({
  group,
  expanded,
  onToggle,
  onAction,
  busy,
  highlighted,
  note,
}: ReportGroupCardProps) {
  const openCount = group.openReports.length;
  // group.reports follows the table's sort, so row 0 is the OLDEST under
  // "Oldest first" — pick by timestamp instead so this agrees with `newestAt`.
  const newest = [...group.reports].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  )[0];
  const repeat = group.reportCountForKyte > 1;
  const partial = group.reportCountForKyte > group.reports.length;
  const collapsible = group.reports.length > 1;
  const showAll = expanded || !collapsible;

  return (
    <li
      className={`flex flex-col gap-2 rounded-card border p-3 ${
        highlighted ? "border-accent-border bg-accent-soft/50" : "border-cardline bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {group.kyteId ? (
          <Link
            href={`/orgs/${group.orgId}/${group.kyteId}`}
            className="cursor-pointer text-[13px] font-semibold text-accent hover:text-accent-hover"
          >
            {group.username ? `@${group.username}` : "Kyte without a username"}
          </Link>
        ) : (
          <span className="text-[13px] font-semibold text-ink">
            {group.username ? `@${group.username}` : "Unknown kyte"}
          </span>
        )}
        <StatusPill label={REPORT_STATUS_LABELS[group.status]} tone={STATUS_TONE[group.status]} />
        <span
          className={`rounded-pill px-2.5 py-0.5 text-[12px] tabular-nums ${
            repeat ? "bg-accent-soft font-semibold text-accent" : "bg-tint text-secondary"
          }`}
        >
          {group.reportCountForKyte} {plural(group.reportCountForKyte, "report")}
        </span>
        {newest ? (
          <span className="rounded-pill bg-tint px-2.5 py-0.5 text-[12px] text-secondary">
            {ABUSE_REASON_LABELS[newest.reason]}
          </span>
        ) : null}
        {group.reports.some((report) => report.openedByAdmin) ? (
          <span className="rounded-pill border border-border px-2.5 py-0.5 text-[12px] text-tertiary">
            Opened by an admin
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-tertiary">
        {group.kyteModerationStatus ? (
          <ModerationStatusPill status={group.kyteModerationStatus} />
        ) : null}
        {group.userStatus ? <UserStatusPill status={group.userStatus} /> : null}
        {group.ownerEmail ? (
          group.userId ? (
            <Link
              href={`/users/${group.userId}`}
              className="cursor-pointer truncate text-secondary hover:text-ink"
            >
              {group.ownerEmail}
            </Link>
          ) : (
            <span className="truncate text-secondary">{group.ownerEmail}</span>
          )
        ) : null}
        {group.reportedUrl ? (
          <CopyableUrl value={group.reportedUrl} openLabel="Open the reported page in a new tab" />
        ) : (
          <span>No URL recorded</span>
        )}
        {group.kyteId ? (
          <ViewPageLink kyteId={group.kyteId} username={group.username} />
        ) : null}
        <span title={formatDateTimeFull(group.newestAt)}>
          newest {formatRelativeTime(group.newestAt)}
        </span>
        {partial ? (
          <span>
            {group.reports.length} of {group.reportCountForKyte} loaded here
          </span>
        ) : null}
      </div>

      {showAll ? (
        <ul className="flex flex-col gap-2 border-t border-hairline pt-2">
          {group.reports.map((report) => (
            <li key={report.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-tertiary">
                <span className="font-medium text-secondary">
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{ABUSE_REASON_LABELS[report.reason]}</span>
                <span aria-hidden="true">·</span>
                <span title={formatDateTimeFull(report.createdAt)}>{formatRelativeTime(report.createdAt)}</span>
                {report.openedByAdmin ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>opened by an admin</span>
                  </>
                ) : null}
              </div>
              <p
                className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-secondary"
                title={report.details || undefined}
              >
                {report.details ? truncate(report.details, DETAILS_MAX) : "No details given."}
              </p>
              {report.reviewedAt ? (
                <p className="text-[12px] text-tertiary" title={formatDateTimeFull(report.reviewedAt)}>
                  Closed by {report.reviewedBy ?? "an admin"} {formatRelativeTime(report.reviewedAt)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : newest ? (
        <p
          className="text-[13px] leading-relaxed break-words text-secondary"
          title={newest.details || undefined}
        >
          {newest.details ? truncate(newest.details, PREVIEW_MAX) : "No details given."}
        </p>
      ) : null}

      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="cursor-pointer self-start text-[12px] font-medium text-accent hover:text-accent-hover"
        >
          {expanded
            ? "Hide reports"
            : `Show all ${group.reports.length} ${plural(group.reports.length, "report")}`}
        </button>
      ) : null}

      {note ? <p className="text-[12px] font-medium text-success">{note}</p> : null}

      {openCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-2">
          <Button size="sm" tone="warning" onClick={() => onAction("suspend")} disabled={busy}>
            Suspend kyte
          </Button>
          <Button size="sm" tone="secondary" onClick={() => onAction("dismiss")} disabled={busy}>
            Dismiss
          </Button>
          {openCount > 1 ? (
            <span className="text-[12px] text-tertiary">
              closes the {openCount} open reports loaded here
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
