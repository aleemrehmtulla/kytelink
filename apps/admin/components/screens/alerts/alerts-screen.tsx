import { useCallback, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { DataTable, type Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { PageHeader } from "../../ui/page-header";
import { StatGroup } from "../../ui/stat-group";
import { StatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import type { AdminAlertRow, AlertsInput, AlertsOutput } from "../../../lib/admin-source";
import { formatNumber } from "../../../lib/format";
import { RelativeTime } from "../audit/relative-time";
import { SegmentedControl } from "../audit/segmented-control";
import { alertKindMeta } from "./alert-kinds";
import { CopyMessage } from "./copy-message";

type AlertStatus = "unresolved" | "resolved" | "all";
type AlertsQueryInput = AlertsInput & { page: number; pageSize: number };

interface Resolution {
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface PendingState {
  key: string;
  map: Record<string, Resolution>;
}

const NO_PENDING: Record<string, Resolution> = {};

const FILTER_DEFAULTS: Record<string, string> = { status: "unresolved", kind: "" };

const RESOLVE_MEANING =
  "Marking an alert resolved records who cleared it and when, and removes it from the unresolved queue. It doesn't fix the underlying issue and it doesn't delete the record.";

const SELECT_CLASS =
  "rounded-input border-border bg-card text-ink cursor-pointer border px-2.5 py-1.5 text-[13px]";

function readStatus(value: string | undefined): AlertStatus {
  return value === "resolved" || value === "all" ? value : "unresolved";
}

export function AlertsScreen() {
  const source = useAdminSource();
  const { toast } = useToast();
  const table = useTableState<"lastSeenAt">(
    { sort: "lastSeenAt", dir: "desc", pageSize: 25 },
    FILTER_DEFAULTS,
  );
  const { setFilter } = table;

  const status = readStatus(table.filters.status);
  const kind = table.filters.kind ?? "";

  const [pendingState, setPendingState] = useState<PendingState>({ key: "", map: {} });
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [bulkKind, setBulkKind] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const input = useMemo<AlertsQueryInput>(
    () => ({
      page: table.page,
      pageSize: table.pageSize,
      status,
      kind: kind || undefined,
    }),
    [table.page, table.pageSize, status, kind],
  );

  const run = useCallback(
    (next: AlertsQueryInput): Promise<AlertsOutput> => source.alerts(next),
    [source],
  );
  const { data, status: queryStatus, reload } = usePagedQuery(run, input);

  // Optimistic resolutions belong to the query that produced the rows; a new
  // page or filter means the server answer is authoritative again.
  const pageKey = JSON.stringify(input);
  const pending = pendingState.key === pageKey ? pendingState.map : NO_PENDING;

  const rows = data?.rows ?? [];
  const kinds = data?.kinds ?? [];

  function resolutionOf(row: AdminAlertRow): Resolution {
    return pending[row.id] ?? { resolvedAt: row.resolvedAt, resolvedBy: row.resolvedBy };
  }

  const countDelta = rows.reduce(
    (acc, row) => {
      const local = pending[row.id];
      if (!local) return acc;
      const wasResolved = row.resolvedAt !== null;
      const isResolved = local.resolvedAt !== null;
      if (wasResolved === isResolved) return acc;
      return isResolved
        ? { unresolved: acc.unresolved - 1, resolved: acc.resolved + 1 }
        : { unresolved: acc.unresolved + 1, resolved: acc.resolved - 1 };
    },
    { unresolved: 0, resolved: 0 },
  );

  const unresolvedCount = Math.max(0, (data?.counts.unresolved ?? 0) + countDelta.unresolved);
  const resolvedCount = Math.max(0, (data?.counts.resolved ?? 0) + countDelta.resolved);

  function setBusy(alertId: string, busy: boolean) {
    setBusyIds((prev) => (busy ? [...prev, alertId] : prev.filter((id) => id !== alertId)));
  }

  // Functional updates only: an Undo fired from a toast runs with a render's
  // worth of stale state, and must not drop other rows' optimistic updates.
  function applyPending(alertId: string, next: Resolution) {
    setPendingState((prev) => ({
      key: pageKey,
      map: { ...(prev.key === pageKey ? prev.map : {}), [alertId]: next },
    }));
  }

  function revertPending(alertId: string, previous: Resolution | undefined) {
    setPendingState((prev) => {
      const map = { ...(prev.key === pageKey ? prev.map : {}) };
      if (previous) map[alertId] = previous;
      else delete map[alertId];
      return { key: pageKey, map };
    });
  }

  async function reopen(row: AdminAlertRow) {
    const previous = pending[row.id];
    setBusy(row.id, true);
    applyPending(row.id, { resolvedAt: null, resolvedBy: null });
    try {
      await source.unresolveAlert(row.id);
      toast("Reopened — it's back in the unresolved queue.", { tone: "success" });
    } catch {
      revertPending(row.id, previous);
      toast("Couldn't reopen that alert. Nothing changed.", { tone: "danger" });
    } finally {
      setBusy(row.id, false);
    }
  }

  async function markResolved(row: AdminAlertRow) {
    const previous = pending[row.id];
    setBusy(row.id, true);
    applyPending(row.id, { resolvedAt: new Date().toISOString(), resolvedBy: "you" });
    try {
      await source.resolveAlert(row.id);
      toast("Marked resolved — cleared from the queue, record kept.", {
        tone: "success",
        undo: () => void reopen(row),
      });
    } catch {
      revertPending(row.id, previous);
      toast("Couldn't mark that alert resolved. Nothing changed.", { tone: "danger" });
    } finally {
      setBusy(row.id, false);
    }
  }

  async function confirmBulk() {
    if (!bulkKind) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      const result = await source.resolveAlertsByKind(bulkKind);
      const label = alertKindMeta(bulkKind).label;
      setBulkKind(null);
      setPendingState({ key: "", map: {} });
      // The set can shrink past the current page, which would strand the admin on
      // an empty page next to a "showing 76-100 of 100" summary.
      table.setPage(1);
      reload();
      toast(
        `Marked ${formatNumber(result.resolved)} ${label} ${result.resolved === 1 ? "alert" : "alerts"} resolved.`,
        { tone: "success" },
      );
    } catch {
      setBulkError("Couldn't mark those alerts resolved. Nothing changed.");
    } finally {
      setBulkBusy(false);
    }
  }

  const activeFacet = kind ? kinds.find((facet) => facet.kind === kind) : undefined;
  const activeMeta = kind ? alertKindMeta(kind) : null;
  const bulkFacetCount = bulkKind
    ? (kinds.find((facet) => facet.kind === bulkKind)?.unresolved ?? 0)
    : 0;

  const columns: Column<AdminAlertRow>[] = [
    {
      key: "kind",
      header: "Alert",
      width: "212px",
      mobile: "title",
      cell: (row) => {
        const meta = alertKindMeta(row.kind);
        return (
          <span title={meta.hint}>
            <StatusPill
              label={meta.label}
              tone={resolutionOf(row).resolvedAt ? "neutral" : meta.tone}
            />
          </span>
        );
      },
    },
    {
      key: "message",
      header: "What happened",
      mobile: "detail",
      cell: (row) => (
        <span className="flex items-start gap-2">
          <span className="text-secondary">{row.message}</span>
          <CopyMessage text={row.message} />
        </span>
      ),
    },
    {
      key: "seen",
      header: "Seen",
      width: "230px",
      align: "right",
      mobile: "meta",
      cell: (row) => {
        const resolution = resolutionOf(row);
        if (resolution.resolvedAt) {
          return (
            <span className="text-tertiary">
              {`Resolved by ${resolution.resolvedBy ?? "an admin"} · `}
              <RelativeTime iso={resolution.resolvedAt} />
            </span>
          );
        }
        return (
          <span className="text-tertiary">
            {row.occurrences > 1 ? (
              <>
                <span className="text-ink font-medium tabular-nums">
                  ×{formatNumber(row.occurrences)}
                </span>
                {", last "}
                <RelativeTime iso={row.lastSeenAt} />
              </>
            ) : (
              <RelativeTime iso={row.createdAt} />
            )}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "132px",
      mobile: "actions",
      cell: (row) => {
        const busy = busyIds.includes(row.id);
        return resolutionOf(row).resolvedAt ? (
          <Button tone="ghost" size="sm" busy={busy} disabled={busy} onClick={() => void reopen(row)}>
            Reopen
          </Button>
        ) : (
          <Button
            tone="success"
            size="sm"
            busy={busy}
            disabled={busy}
            onClick={() => void markResolved(row)}
          >
            Mark resolved
          </Button>
        );
      },
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        label="Filter alerts by status"
        value={status}
        options={[
          { value: "unresolved", label: "Unresolved", count: unresolvedCount },
          { value: "resolved", label: "Resolved", count: resolvedCount },
          { value: "all", label: "All" },
        ]}
        onChange={(next) => setFilter("status", next)}
      />

      {kinds.length > 0 ? (
        <select
          value={kind}
          aria-label="Filter alerts by kind"
          title={activeMeta?.hint}
          onChange={(event) => setFilter("kind", event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All kinds</option>
          {kinds.map((facet) => (
            <option key={facet.kind} value={facet.kind}>
              {`${alertKindMeta(facet.kind).label} (${formatNumber(
                status === "unresolved" ? facet.unresolved : facet.total,
              )})`}
            </option>
          ))}
        </select>
      ) : null}

      <span className="grow" />

      {activeFacet && activeFacet.unresolved > 0 ? (
        <Button tone="secondary" size="sm" onClick={() => setBulkKind(activeFacet.kind)}>
          {`Resolve all ${formatNumber(activeFacet.unresolved)}`}
        </Button>
      ) : null}
      <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
        Export
      </Button>
    </div>
  );

  const emptyTitle = activeMeta
    ? `No ${activeMeta.label} alerts here.`
    : status === "resolved"
      ? "Nothing resolved yet."
      : status === "all"
        ? "No alerts have ever fired."
        : "Nothing unresolved.";

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Problems the platform noticed on its own. Resolving one clears it from the queue — it doesn't fix the cause."
      />

      <div className="mb-4">
        <StatGroup
          columns={3}
          size="compact"
          items={[
            {
              key: "unresolved",
              label: "Unresolved",
              value: data ? formatNumber(unresolvedCount) : "—",
              tone: unresolvedCount > 0 ? "danger" : "default",
              sub: unresolvedCount === 0 ? "all clear" : "need a look",
            },
            {
              key: "resolved",
              label: "Resolved",
              value: data ? formatNumber(resolvedCount) : "—",
              sub: "record kept",
            },
            {
              key: "kinds",
              label: "Kinds firing",
              value: data ? formatNumber(kinds.length) : "—",
              tone: kinds.length > 1 ? "warning" : "default",
              sub: kinds.length === 0 ? "none" : "distinct failure modes",
            },
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        status={queryStatus}
        onRetry={reload}
        caption="Platform alerts matching the current status and kind filters"
        unit="alerts"
        toolbar={toolbar}
        empty={{
          title: emptyTitle,
          description:
            "Revalidate dead-letters, moderation fail-opens, and schedule failures land here.",
          action: activeMeta ? (
            <Button tone="secondary" size="sm" onClick={() => setFilter("kind", "")}>
              Show all kinds
            </Button>
          ) : undefined,
        }}
        pagination={{
          page: data?.page ?? table.page,
          pageSize: data?.pageSize ?? table.pageSize,
          total: data?.total ?? 0,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      <ConfirmDialog
        open={bulkKind !== null}
        title={bulkKind ? `Mark all ${alertKindMeta(bulkKind).label} alerts resolved?` : ""}
        description={`This clears every unresolved alert of this kind from the queue in one go. ${RESOLVE_MEANING} Rows can still be reopened individually.`}
        details={
          bulkKind
            ? [
                { label: "Kind", value: alertKindMeta(bulkKind).label },
                { label: "Rows affected", value: formatNumber(bulkFacetCount) },
              ]
            : undefined
        }
        confirmLabel="Mark all resolved"
        tone="warning"
        busy={bulkBusy}
        error={bulkError}
        onConfirm={() => void confirmBulk()}
        onCancel={() => {
          setBulkKind(null);
          setBulkError(null);
        }}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="alerts"
        filters={{ status, kind: kind || undefined }}
        title="Export alerts"
        scopeDescription={`${formatNumber(data?.total ?? 0)} ${
          (data?.total ?? 0) === 1 ? "alert" : "alerts"
        } matching your filters.`}
      />
    </>
  );
}
