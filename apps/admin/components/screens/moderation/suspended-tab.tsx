import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { DataTable } from "../../ui/data-table";
import type { Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import { formatNumber, nonBlank } from "../../../lib/format";
import type {
  ModerationSignal,
  SuspendedListInput,
  SuspendedListOutput,
  SuspendedRow,
} from "../../../lib/admin-source";
import { FilterChip } from "./filter-chip";
import {
  CONFIRM_TITLES,
  REASON_LABEL,
  REASON_PLACEHOLDER,
  SIGNAL_OPTIONS,
  bulkRestoreKytesCopy,
  plural,
  restoreKyteCopy,
  type SuspensionScope,
  type SuspensionSource,
} from "./moderation-copy";
import { SuspendedRowBody } from "./suspended-row";

type SuspendedSort = NonNullable<SuspendedListInput["sort"]>;
type SuspendedQuery = SuspendedListInput & { page: number; pageSize: number };

interface PendingAction {
  rows: SuspendedRow[];
  bulk: boolean;
}

const SELECT =
  "cursor-pointer rounded-input border border-border bg-card px-2.5 py-2 text-[13px] text-ink";

const SCOPES: SuspensionScope[] = ["kyte", "org"];

const SCOPE_OPTIONS: { value: "" | SuspensionScope; label: string }[] = [
  { value: "", label: "Any scope" },
  { value: "kyte", label: "Kyte suspended" },
  { value: "org", label: "Org suspended" },
];

const SOURCES: SuspensionSource[] = ["auto", "seed-sweep", "manual"];

const SOURCE_OPTIONS: { value: "" | SuspensionSource; label: string }[] = [
  { value: "", label: "Any source" },
  { value: "auto", label: "Automated" },
  { value: "seed-sweep", label: "Seed sweep" },
  { value: "manual", label: "Admin" },
];

const SORT_OPTIONS: { value: string; label: string; sort: SuspendedSort; dir: "asc" | "desc" }[] = [
  { value: "suspendedAt:desc", label: "Newest first", sort: "suspendedAt", dir: "desc" },
  { value: "suspendedAt:asc", label: "Oldest first", sort: "suspendedAt", dir: "asc" },
  { value: "username:asc", label: "Username A–Z", sort: "username", dir: "asc" },
  { value: "confidence:desc", label: "Highest confidence", sort: "confidence", dir: "desc" },
];

const SIGNAL_KEYS = SIGNAL_OPTIONS.map((option) => option.key);

function parseScope(value: string | undefined): "" | SuspensionScope {
  return SCOPES.find((scope) => scope === value) ?? "";
}

function parseSource(value: string | undefined): "" | SuspensionSource {
  return SOURCES.find((source) => source === value) ?? "";
}

function parseSignals(value: string | undefined): ModerationSignal["key"][] {
  if (!value) return [];
  return value
    .split(",")
    .filter((key): key is ModerationSignal["key"] => SIGNAL_KEYS.some((known) => known === key));
}

export interface SuspendedTabProps {
  onActed: () => void;
}

export function SuspendedTab({ onActed }: SuspendedTabProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const table = useTableState<SuspendedSort>(
    { sort: "suspendedAt", dir: "desc", pageSize: 25 },
    { q: "", scope: "", source: "", signals: "" },
  );

  const search = table.filters.q ?? "";
  const debouncedSearch = useDebouncedValue(search, 250);
  const scope = parseScope(table.filters.scope);
  const sourceFilter = parseSource(table.filters.source);
  const signals = parseSignals(table.filters.signals);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restored, setRestored] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [signalsOpen, setSignalsOpen] = useState(signals.length > 0);

  const filters = {
    search: debouncedSearch,
    signals: signals.length === 0 ? undefined : signals,
    scope: scope === "" ? undefined : scope,
    source: sourceFilter === "" ? undefined : sourceFilter,
    sort: table.sort,
    dir: table.dir,
  };

  const input: SuspendedQuery = { ...filters, page: table.page, pageSize: table.pageSize };

  const run = useCallback(
    (next: SuspendedQuery): Promise<SuspendedListOutput> => source.suspendedList(next),
    [source],
  );
  const { data, status, reload } = usePagedQuery(run, input);

  const queryKey = JSON.stringify(input);
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setSelected(new Set());
    setRestored({});
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  function toggleSignal(key: ModerationSignal["key"]) {
    const next = signals.includes(key) ? signals.filter((item) => item !== key) : [...signals, key];
    table.setFilter("signals", next.join(","));
  }

  async function runPending(reason: string) {
    if (!pending) return;
    const { rows: targets, bulk } = pending;
    setBusy(true);
    const note = "Restored — leaves this list on the next refresh.";
    setRestored((prev) => {
      const next = { ...prev };
      for (const row of targets) next[row.kyteId] = note;
      return next;
    });

    const results = await Promise.allSettled(
      targets.map((row) => source.unsuspendKyte({ kyteId: row.kyteId, reason })),
    );
    const failed = targets.filter((_, index) => results[index]?.status === "rejected");

    if (failed.length > 0) {
      setRestored((prev) => {
        const next = { ...prev };
        for (const row of failed) delete next[row.kyteId];
        return next;
      });
    }
    setSelected((prev) => {
      if (bulk) return new Set(failed.map((row) => row.kyteId));
      const next = new Set(prev);
      for (const row of targets) {
        if (failed.includes(row)) next.add(row.kyteId);
        else next.delete(row.kyteId);
      }
      return next;
    });
    setBusy(false);
    setPending(null);

    if (failed.length === 0) {
      toast(`Restored ${targets.length} ${plural(targets.length, "kyte")}.`, { tone: "success" });
    } else {
      toast(
        `Couldn't restore ${failed.length} of ${targets.length} ${plural(
          targets.length,
          "kyte",
        )}.${bulk ? " They stay selected." : ""}`,
        { tone: "danger" },
      );
    }
    onActed();
  }

  // Org-scoped rows are down because their org is down, so unsuspendKyte would
  // be a no-op on them — the fix is on the org, and the row links there.
  function startBulk() {
    const selectedRows = rows.filter((row) => selected.has(row.kyteId));
    const targets = selectedRows.filter((row) => row.scope === "kyte");
    if (targets.length === 0) {
      toast("Every selected kyte is down because its org is suspended. Restore the org instead.", {
        tone: "danger",
      });
      return;
    }
    setPending({ rows: targets, bulk: true });
  }

  const columns: Column<SuspendedRow>[] = [
    {
      key: "dossier",
      header: "Kyte",
      mobile: "title",
      cell: (row) => <SuspendedRowBody row={row} note={restored[row.kyteId]} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "210px",
      mobile: "actions",
      cell: (row) => {
        if (restored[row.kyteId]) {
          return <span className="text-[12px] text-tertiary">Actioned this session</span>;
        }
        return (
          <div className="flex flex-col items-end gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-end">
            {row.scope === "kyte" ? (
              <Button
                size="sm"
                tone="success"
                onClick={() => setPending({ rows: [row], bulk: false })}
              >
                Restore
              </Button>
            ) : (
              <Link
                href={`/orgs/${row.orgId}`}
                className="cursor-pointer rounded-pill border border-border bg-card px-3 py-1 text-[12px] font-medium text-secondary hover:bg-tint"
              >
                Open org
              </Link>
            )}
            <Link
              href={`/orgs/${row.orgId}/${row.kyteId}`}
              className="cursor-pointer rounded-pill border border-border bg-card px-3 py-1 text-[12px] font-medium text-secondary hover:bg-tint"
            >
              Open kyte
            </Link>
          </div>
        );
      },
    },
  ];

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => table.setFilter("q", event.target.value)}
          placeholder="Search username, name, email, evidence…"
          aria-label="Search suspended kytes"
          className="w-80 min-w-0 flex-1 rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint sm:max-w-md"
        />
        <select
          value={scope}
          onChange={(event) => table.setFilter("scope", event.target.value)}
          aria-label="Filter by what took the kyte down"
          className={SELECT}
        >
          {SCOPE_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(event) => table.setFilter("source", event.target.value)}
          aria-label="Filter by who suspended it"
          className={SELECT}
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={`${table.sort}:${table.dir}`}
          onChange={(event) => {
            const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
            if (option) table.setSort(option.sort, option.dir);
          }}
          aria-label="Sort suspended kytes"
          className={SELECT}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSignalsOpen((open) => !open)}
          aria-expanded={signalsOpen}
          className="cursor-pointer rounded-pill border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-tertiary hover:bg-tint"
        >
          Signals
          {signals.length > 0 ? (
            <span className="ml-1.5 tabular-nums text-accent">{signals.length}</span>
          ) : null}
        </button>
        <span className="grow" />
        <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      {signalsOpen ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {SIGNAL_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              active={signals.includes(option.key)}
              onClick={() => toggleSignal(option.key)}
            >
              {option.label}
            </FilterChip>
          ))}
          {signals.length > 0 ? (
            <button
              type="button"
              onClick={() => table.setFilter("signals", "")}
              className="cursor-pointer text-[12px] font-medium text-accent hover:text-accent-hover"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const bulkBar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-ink">
        {selected.size} {plural(selected.size, "kyte")} selected
      </span>
      <Button size="sm" tone="success" onClick={startBulk} disabled={busy}>
        Restore selected
      </Button>
      <Button size="sm" tone="ghost" onClick={() => setSelected(new Set())} disabled={busy}>
        Clear
      </Button>
    </div>
  );

  const dialog = pending ? buildDialog(pending) : null;

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.kyteId}
        status={status}
        onRetry={reload}
        caption="Kytes that are suspended, on their own or with their org"
        unit="kytes"
        empty={{
          title: "Nothing suspended right now.",
          description: "Spam-free — nice. Filters may also be hiding rows.",
        }}
        selection={{
          selected,
          onChange: setSelected,
          disabled: (row) => restored[row.kyteId] !== undefined,
        }}
        pagination={{
          page: table.page,
          pageSize: table.pageSize,
          total,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        toolbar={toolbar}
        bulkBar={selected.size > 0 ? bulkBar : undefined}
      />

      {dialog ? (
        <ConfirmDialog
          open
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          tone="default"
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
        dataset="suspended"
        filters={filters}
        title="Export suspended kytes"
        scopeDescription={`${formatNumber(total)} suspended ${plural(total, "kyte")} matching your filters`}
      />
    </>
  );
}

function buildDialog({ rows, bulk }: PendingAction) {
  const first = rows[0];
  const names = rows
    .slice(0, 4)
    .map((row) => (row.username ? `@${row.username}` : row.kyteId))
    .join(", ");
  const listValue = rows.length > 4 ? `${names} and ${rows.length - 4} more` : names;

  return {
    title: bulk
      ? `Restore ${rows.length} ${plural(rows.length, "kyte")}`
      : CONFIRM_TITLES.restoreKyte,
    description: bulk
      ? bulkRestoreKytesCopy(rows.length)
      : restoreKyteCopy(nonBlank(first?.username)),
    confirmLabel: bulk ? `Restore ${rows.length}` : "Restore kyte",
    details: bulk
      ? [{ label: "Kytes", value: listValue }]
      : first
        ? [
            { label: "Kyte", value: first.username ? `@${first.username}` : first.kyteId },
            { label: "Owner", value: first.email },
          ]
        : [],
  };
}
