import { useCallback, useMemo, useState } from "react";
import { ABUSE_REPORT_REASONS, REPORT_STATUSES } from "@kytelink/schemas";
import type { AbuseReportReason, ReportStatus } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { ExportDialog } from "../../ui/export-dialog";
import { LoadingState } from "../../ui/loading-state";
import { Pagination } from "../../ui/pagination";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import {
  formatNumber,
  nonBlank,
} from "../../../lib/format";
import type {
  AbuseReportRow,
  AbuseReportsInput,
  AbuseReportsOutput,
} from "../../../lib/admin-source";
import { FilterChip } from "./filter-chip";
import {
  ABUSE_REASON_OPTIONS,
  CONFIRM_TITLES,
  DISMISS_REPORT_COPY,
  REASON_LABEL,
  REASON_PLACEHOLDER,
  plural,
  suspendKyteCopy,
} from "./moderation-copy";
import { truncate } from "./moderation-text";
import { ReportGroupCard } from "./report-group-card";
import { groupReports, type ReportGroup } from "./report-groups";

type ReportsSort = NonNullable<AbuseReportsInput["sort"]>;
type ReportsQuery = AbuseReportsInput & { page: number; pageSize: number };
type StatusFilter = ReportStatus | "ALL";
type ActionKind = "suspend" | "dismiss";

interface ReportOverride {
  status: ReportStatus;
  reviewedAt: string;
}

export interface ReportFocus {
  username: string;
  reportId: string;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "ACTIONED", label: "Actioned" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

const SORT_OPTIONS: { value: string; label: string; sort: ReportsSort; dir: "asc" | "desc" }[] = [
  { value: "createdAt:desc", label: "Newest first", sort: "createdAt", dir: "desc" },
  { value: "createdAt:asc", label: "Oldest first", sort: "createdAt", dir: "asc" },
  {
    value: "reportCountForKyte:desc",
    label: "Most reported",
    sort: "reportCountForKyte",
    dir: "desc",
  },
];

const SELECT =
  "cursor-pointer rounded-input border border-border bg-card px-2.5 py-2 text-[13px] text-ink";

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "ALL") return "ALL";
  return REPORT_STATUSES.find((status) => status === value) ?? "OPEN";
}

function parseReason(value: string | undefined): "" | AbuseReportReason {
  return ABUSE_REPORT_REASONS.find((reason) => reason === value) ?? "";
}

export interface ReportsTabProps {
  onActed: () => void;
  focus: ReportFocus | null;
  openCount: number;
}

export function ReportsTab({ onActed, focus, openCount }: ReportsTabProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const table = useTableState<ReportsSort>(
    { sort: "createdAt", dir: "desc", pageSize: 25 },
    { q: "", status: "OPEN", reason: "" },
  );
  const setFilter = table.setFilter;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, ReportOverride>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ kind: ActionKind; group: ReportGroup } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dismissedFocus, setDismissedFocus] = useState<ReportFocus | null>(null);

  const activeFocus = focus !== null && focus !== dismissedFocus ? focus : null;
  const focusedId = activeFocus?.reportId ?? null;

  const search = activeFocus ? activeFocus.username : (table.filters.q ?? "");
  const debouncedSearch = useDebouncedValue(search, 250);
  const statusFilter = parseStatus(table.filters.status);
  const reasonFilter = parseReason(table.filters.reason);

  const filters = {
    status: activeFocus !== null || statusFilter === "ALL" ? undefined : statusFilter,
    reason: reasonFilter === "" ? undefined : reasonFilter,
    search: debouncedSearch,
    sort: table.sort,
    dir: table.dir,
  };

  const input: ReportsQuery = { ...filters, page: table.page, pageSize: table.pageSize };

  const run = useCallback(
    (next: ReportsQuery): Promise<AbuseReportsOutput> => source.abuseReports(next),
    [source],
  );
  const { data, status, reload } = usePagedQuery(run, input);

  const queryKey = JSON.stringify(input);
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setOverrides({});
    setNotes({});
    setExpanded(new Set());
  }

  const total = data?.total ?? 0;
  const groups = useMemo(() => {
    const rows = (data?.rows ?? []).map((row) => {
      const override = overrides[row.id];
      return override ? { ...row, status: override.status, reviewedAt: override.reviewedAt } : row;
    });
    return groupReports(rows);
  }, [data, overrides]);

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runPending(reason: string) {
    if (!pending) return;
    const { kind, group } = pending;
    const targets = group.openReports;
    setBusy(true);

    const nextStatus: ReportStatus = kind === "dismiss" ? "DISMISSED" : "ACTIONED";
    const reviewedAt = new Date().toISOString();
    setOverrides((prev) => {
      const next = { ...prev };
      for (const report of targets) next[report.id] = { status: nextStatus, reviewedAt };
      return next;
    });

    const failed: AbuseReportRow[] = [];
    for (const report of targets) {
      try {
        await source.actionAbuseReport({ reportId: report.id, action: kind, reason });
      } catch {
        failed.push(report);
      }
    }

    if (failed.length > 0) {
      setOverrides((prev) => {
        const next = { ...prev };
        for (const report of failed) delete next[report.id];
        return next;
      });
      toast(
        `Couldn't close ${failed.length} of ${targets.length} ${plural(targets.length, "report")}. They stay open.`,
        { tone: "danger" },
      );
    } else {
      setNotes((prev) => ({ ...prev, [group.key]: noteFor(kind, targets.length) }));
      toast(successFor(kind, group.username, targets.length), { tone: "success" });
    }

    setBusy(false);
    setPending(null);
    onActed();
  }

  const dialog = pending ? buildDialog(pending.kind, pending.group) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {activeFocus ? null : (
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                active={statusFilter === option.value}
                onClick={() => setFilter("status", option.value)}
                count={option.value === "OPEN" ? openCount : undefined}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        )}
        <input
          type="search"
          value={search}
          onChange={(event) => {
            if (focus !== null) setDismissedFocus(focus);
            setFilter("q", event.target.value);
          }}
          placeholder="Search username, URL, report details…"
          aria-label="Search reports"
          className="min-w-0 flex-1 rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint sm:max-w-md"
        />
        {activeFocus ? null : (
          <select
            value={reasonFilter}
            onChange={(event) => setFilter("reason", event.target.value)}
            aria-label="Filter reports by reason"
            className={SELECT}
          >
            <option value="">Any reason</option>
            {ABUSE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <select
          value={`${table.sort}:${table.dir}`}
          onChange={(event) => {
            const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
            if (option) table.setSort(option.sort, option.dir);
          }}
          aria-label="Sort reports"
          className={SELECT}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="grow" />
        <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      {activeFocus ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-accent-border bg-accent-soft px-4 py-2.5">
          <p className="text-[13px] text-ink">
            Showing every report for @{activeFocus.username}, open or closed — the case you just
            opened is highlighted.
          </p>
          <Button
            size="sm"
            tone="ghost"
            onClick={() => {
              if (focus !== null) setDismissedFocus(focus);
              setFilter("q", "");
            }}
          >
            Back to the queue
          </Button>
        </div>
      ) : null}

      {status === "error" && data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-danger-border bg-danger-soft px-4 py-2.5">
          <p className="text-[13px] text-danger">
            Couldn&apos;t refresh the queue. You&apos;re looking at the last result that loaded.
          </p>
          <Button size="sm" tone="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : null}

      {status === "loading" && !data ? (
        <LoadingState rows={6} />
      ) : status === "error" && !data ? (
        <ErrorState onRetry={reload} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Nothing to triage."
          description="No reports match these filters. Try “All” to include closed ones."
          framed
        />
      ) : (
        <ul className={`flex flex-col gap-3 ${status === "loading" ? "opacity-60" : ""}`}>
          {groups.map((group) => (
            <ReportGroupCard
              key={group.key}
              group={group}
              expanded={expanded.has(group.key)}
              onToggle={() => toggleExpanded(group.key)}
              onAction={(kind) => setPending({ kind, group })}
              busy={busy}
              highlighted={
                focusedId !== null && group.reports.some((report) => report.id === focusedId)
              }
              note={notes[group.key]}
            />
          ))}
        </ul>
      )}

      <Pagination
        page={table.page}
        pageSize={table.pageSize}
        total={total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        label="reports"
      />

      {dialog ? (
        <ConfirmDialog
          open
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          tone={dialog.tone}
          typeToConfirm={dialog.typeToConfirm}
          details={dialog.details}
          requireReason
          reasonLabel={REASON_LABEL}
          reasonPlaceholder={REASON_PLACEHOLDER}
          reasonMinLength={3}
          busy={busy}
          onConfirm={(reason) => void runPending(reason)}
          onCancel={() => setPending(null)}
        />
      ) : null}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="reports"
        filters={filters}
        title="Export reports"
        scopeDescription={`${formatNumber(total)} ${plural(total, "report")} matching your filters`}
      />
    </div>
  );
}

function buildDialog(kind: ActionKind, group: ReportGroup) {
  const openCount = group.openReports.length;
  const details = [
    { label: "Kyte", value: group.username ? `@${group.username}` : group.kyteId },
    { label: "Owner", value: nonBlank(group.ownerEmail) ?? "unknown" },
    {
      label: "Reports closing",
      value: `${openCount} of ${group.reportCountForKyte} ${plural(group.reportCountForKyte, "report")}`,
    },
    ...(group.reportedUrl ? [{ label: "Reported URL", value: truncate(group.reportedUrl, 60) }] : []),
  ];

  if (kind === "suspend") {
    return {
      title: CONFIRM_TITLES.suspendKyte,
      description: suspendKyteCopy(group.username),
      confirmLabel: "Suspend kyte",
      tone: "warning" as const,
      typeToConfirm: undefined,
      details,
    };
  }
  return {
    title: CONFIRM_TITLES.dismissReport,
    description: DISMISS_REPORT_COPY,
    confirmLabel: openCount > 1 ? `Dismiss ${openCount} reports` : "Dismiss report",
    tone: "default" as const,
    typeToConfirm: undefined,
    details,
  };
}

function noteFor(kind: ActionKind, count: number): string {
  const closed = `${count} ${plural(count, "report")} closed.`;
  if (kind === "dismiss") return `Dismissed — the kyte stays online. ${closed}`;
  return `Kyte suspended — the owner can appeal. ${closed}`;
}

function successFor(kind: ActionKind, username: string | null, count: number): string {
  const handle = username ? `@${username}` : "this kyte";
  if (kind === "dismiss")
    return `${count} ${plural(count, "report")} dismissed. ${handle} stays online.`;
  return `${handle} suspended and ${count} ${plural(count, "report")} closed.`;
}
