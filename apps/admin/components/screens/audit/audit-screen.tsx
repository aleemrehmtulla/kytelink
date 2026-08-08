import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { AUDIT_ACTIONS, type AuditAction } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { CopyId } from "../../ui/copy-id";
import { DataTable, type Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { PageHeader } from "../../ui/page-header";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import type { AuditLogInput, AuditLogOutput, AuditLogRow } from "../../../lib/admin-source";
import {
  formatNumber,
  nonBlank,
  personLabel,
} from "../../../lib/format";
import { ActionPill } from "./action-pill";
import { ADMIN_ACTION_CHOICES, PRODUCT_ACTION_CHOICES, auditActionShortLabel } from "./audit-actions";
import { RelativeTime } from "./relative-time";
import { SegmentedControl } from "./segmented-control";

type AuditScope = "all" | "admin" | "product";
type AuditQueryInput = AuditLogInput & { page: number; pageSize: number };

const FILTER_DEFAULTS: Record<string, string> = {
  search: "",
  actorEmail: "",
  action: "",
  scope: "all",
  from: "",
  to: "",
};

const FILTER_KEYS = Object.keys(FILTER_DEFAULTS);

const SCOPE_OPTIONS: { value: AuditScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin actions" },
  { value: "product", label: "Product" },
];

const INPUT_CLASS =
  "h-[38px] rounded-input border border-border bg-card px-3 text-[13px] text-ink placeholder:text-faint";

function readScope(value: string | undefined): AuditScope {
  return value === "admin" || value === "product" ? value : "all";
}

function readAction(value: string | undefined): AuditAction | "" {
  return AUDIT_ACTIONS.includes(value as AuditAction) ? (value as AuditAction) : "";
}

function toIsoInstant(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function AuditScreen() {
  const source = useAdminSource();
  const router = useRouter();
  const table = useTableState<"createdAt">(
    { sort: "createdAt", dir: "desc", pageSize: 25 },
    FILTER_DEFAULTS,
  );
  const { setFilter } = table;

  const search = table.filters.search ?? "";
  const actorEmail = table.filters.actorEmail ?? "";
  const action = readAction(table.filters.action);
  const scope = readScope(table.filters.scope);
  const from = table.filters.from ?? "";
  const to = table.filters.to ?? "";

  const debouncedSearch = useDebouncedValue(search, 250);
  const debouncedActorEmail = useDebouncedValue(actorEmail, 250);
  // A `datetime-local` fires a change per segment, so an unsettled bound would
  // re-query the log on every digit of the year.
  const debouncedFrom = useDebouncedValue(from, 250);
  const debouncedTo = useDebouncedValue(to, 250);

  const [exportOpen, setExportOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const dateRangeSet = from !== "" || to !== "";
  const exportDeepLinked = router.query.export === "1";

  function closeExport() {
    setExportOpen(false);
    if (!exportDeepLinked) return;
    const query = { ...router.query };
    delete query.export;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }

  const clearFilters = table.clearFilters;

  const input = useMemo<AuditQueryInput>(
    () => ({
      page: table.page,
      pageSize: table.pageSize,
      search: debouncedSearch.trim(),
      actorEmail: debouncedActorEmail.trim(),
      action: action || undefined,
      scope,
      from: toIsoInstant(debouncedFrom),
      to: toIsoInstant(debouncedTo),
    }),
    [
      table.page,
      table.pageSize,
      debouncedSearch,
      debouncedActorEmail,
      action,
      scope,
      debouncedFrom,
      debouncedTo,
    ],
  );

  const run = useCallback(
    (next: AuditQueryInput): Promise<AuditLogOutput> => source.auditLog(next),
    [source],
  );
  const { data, status, reload } = usePagedQuery(run, input);

  const total = data?.total ?? 0;
  const hasFilters = FILTER_KEYS.some(
    (key) => (table.filters[key] ?? FILTER_DEFAULTS[key]) !== FILTER_DEFAULTS[key],
  );

  const exportFilters = useMemo<Record<string, unknown>>(
    () => ({
      search: input.search,
      actorEmail: input.actorEmail,
      action: input.action,
      scope: input.scope,
      from: input.from,
      to: input.to,
    }),
    [input],
  );

  const columns: Column<AuditLogRow>[] = [
    {
      key: "when",
      header: "When",
      width: "128px",
      mobile: "meta",
      cell: (row) => <RelativeTime iso={row.createdAt} className="text-tertiary" />,
    },
    {
      key: "actor",
      header: "Actor",
      width: "216px",
      mobile: "title",
      headerHint: "Click an actor to pivot the log to them",
      cell: (row) => (
        <Link
          href={`/audit?actorEmail=${encodeURIComponent(row.actorEmail)}`}
          onClick={(event) => {
            event.preventDefault();
            setFilter("actorEmail", row.actorEmail);
          }}
          className="block"
        >
          <span className="block truncate font-medium text-ink">
            {personLabel(row.actorName, row.actorEmail)}
          </span>
          {row.actorName ? (
            <span className="block truncate text-[12px] text-tertiary">{row.actorEmail}</span>
          ) : null}
        </Link>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "176px",
      mobile: "detail",
      cell: (row) => <ActionPill action={row.action} isAdminAction={row.isAdminAction} />,
    },
    {
      key: "summary",
      header: "Summary",
      mobile: "detail",
      cell: (row) => <span className="text-secondary">{row.summary}</span>,
    },
    {
      key: "org",
      header: "Org",
      width: "160px",
      mobile: "detail",
      cell: (row) =>
        row.orgId ? (
          <Link href={`/orgs/${row.orgId}`} className="block truncate text-ink hover:text-accent">
            {nonBlank(row.orgName) ?? "Unnamed org"}
          </Link>
        ) : (
          <span className="text-tertiary">Platform</span>
        ),
    },
    {
      key: "kyte",
      header: "Kyte",
      width: "132px",
      mobile: "detail",
      cell: (row) => {
        if (!row.kyteId) return <span className="text-faint">—</span>;
        if (!row.orgId) return <CopyId value={row.kyteId} label="Kyte ID" />;
        return (
          <Link href={`/orgs/${row.orgId}/${row.kyteId}`} className="text-ink hover:text-accent">
            Open kyte
          </Link>
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
          onChange={(event) => setFilter("search", event.target.value)}
          placeholder="Search summaries and actors…"
          aria-label="Search the audit log"
          className={`${INPUT_CLASS} w-full sm:w-56`}
        />
        <input
          type="search"
          value={actorEmail}
          onChange={(event) => setFilter("actorEmail", event.target.value)}
          placeholder="Actor email"
          aria-label="Filter by actor email"
          className={`${INPUT_CLASS} w-full sm:w-44`}
        />
        <select
          value={action}
          onChange={(event) => setFilter("action", event.target.value)}
          aria-label="Filter by action"
          className={`${INPUT_CLASS} cursor-pointer pr-2`}
        >
          <option value="">All actions</option>
          <optgroup label="Admin actions">
            {ADMIN_ACTION_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {auditActionShortLabel(choice)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Product actions">
            {PRODUCT_ACTION_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {auditActionShortLabel(choice)}
              </option>
            ))}
          </optgroup>
        </select>
        <SegmentedControl
          label="Filter by scope"
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={(next) => setFilter("scope", next)}
        />
        <Button
          tone={dateRangeSet ? "secondary" : "ghost"}
          size="sm"
          aria-expanded={datesOpen}
          onClick={() => setDatesOpen((open) => !open)}
        >
          {dateRangeSet ? "Dates · set" : "Dates"}
        </Button>

        <span className="grow" />

        {hasFilters ? (
          <Button tone="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
        <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      {datesOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-tertiary flex items-center gap-1.5 text-[12px]">
            From
            <input
              type="datetime-local"
              value={from}
              max={to || undefined}
              onChange={(event) => setFilter("from", event.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            />
          </label>
          <label className="text-tertiary flex items-center gap-1.5 text-[12px]">
            To
            <input
              type="datetime-local"
              value={to}
              min={from || undefined}
              onChange={(event) => setFilter("to", event.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who did what. Written once, never edited, kept for the life of the platform."
      />

      <DataTable
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        status={status}
        onRetry={reload}
        caption="Audit log rows matching the current filters"
        toolbar={toolbar}
        empty={
          hasFilters
            ? {
                title: "No audit rows match these filters.",
                description:
                  "Widen the date range, switch the scope back to All, or clear the action filter.",
                action: (
                  <Button tone="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ),
              }
            : {
                title: "Nothing has been recorded yet.",
                description:
                  "Publishes, member changes, and every admin action land here the moment they happen.",
              }
        }
        pagination={{
          page: data?.page ?? table.page,
          pageSize: data?.pageSize ?? table.pageSize,
          total,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      <ExportDialog
        open={exportOpen || exportDeepLinked}
        onClose={closeExport}
        dataset="audit"
        filters={exportFilters}
        title="Export audit log"
        scopeDescription={`${formatNumber(total)} ${total === 1 ? "row" : "rows"} — the filters on this page apply to the export.`}
      />
    </>
  );
}
