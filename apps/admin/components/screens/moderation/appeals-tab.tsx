import Link from "next/link";
import { useCallback, useState } from "react";
import { APPEAL_STATUSES } from "@kytelink/schemas";
import type { AppealStatus } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { DataTable } from "../../ui/data-table";
import type { Column } from "../../ui/data-table";
import { StatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { AppealRow, AppealsInput, AppealsOutput } from "../../../lib/admin-source";
import {
  APPEAL_KIND_LABELS,
  APPEAL_STATUS_LABELS,
  CONFIRM_TITLES,
  DISMISS_APPEAL_COPY,
  RESOLVE_APPEAL_COPY,
} from "./moderation-copy";
import { truncate } from "./moderation-text";
import { ViewPageLink } from "./view-page-link";

type AppealsQuery = AppealsInput & { page: number; pageSize: number };
type StatusFilter = AppealStatus | "ALL";

interface PendingResolution {
  row: AppealRow;
  status: "RESOLVED" | "DISMISSED";
}

const MESSAGE_MAX = 320;

const SELECT =
  "cursor-pointer rounded-input border border-border bg-card px-2.5 py-2 text-[13px] text-ink";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

const STATUS_TONE = { OPEN: "warning", RESOLVED: "success", DISMISSED: "neutral" } as const;

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "ALL") return "ALL";
  return APPEAL_STATUSES.find((status) => status === value) ?? "OPEN";
}

/** The target the person is appealing about, when the handle still resolves. */
function targetHref(row: AppealRow): string | null {
  if (row.kyteId && row.orgId) return `/orgs/${row.orgId}/${row.kyteId}`;
  if (row.orgId) return `/orgs/${row.orgId}`;
  if (row.userId) return `/users/${row.userId}`;
  return null;
}

export function AppealsTab({ onActed }: { onActed: () => void }) {
  const source = useAdminSource();
  const { toast } = useToast();
  const table = useTableState(
    { sort: "createdAt", dir: "desc", pageSize: 25 },
    { q: "", status: "OPEN" },
  );

  const search = table.filters.q ?? "";
  const debouncedSearch = useDebouncedValue(search, 250);
  const statusFilter = parseStatus(table.filters.status);

  const [resolved, setResolved] = useState<Record<string, AppealStatus>>({});
  const [pending, setPending] = useState<PendingResolution | null>(null);
  const [busy, setBusy] = useState(false);

  const input: AppealsQuery = {
    search: debouncedSearch,
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
    dir: table.dir,
    page: table.page,
    pageSize: table.pageSize,
  };

  const run = useCallback(
    (next: AppealsQuery): Promise<AppealsOutput> => source.appeals(next),
    [source],
  );
  const { data, status, reload } = usePagedQuery(run, input);

  const queryKey = JSON.stringify(input);
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setResolved({});
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  async function runPending() {
    if (!pending) return;
    const { row, status: next } = pending;
    setBusy(true);
    try {
      await source.resolveAppeal({ appealId: row.id, status: next });
      setResolved((prev) => ({ ...prev, [row.id]: next }));
      toast(next === "RESOLVED" ? "Appeal marked resolved." : "Appeal dismissed.", {
        tone: "success",
      });
      onActed();
    } catch {
      toast("Couldn't close that appeal. Nothing changed.", { tone: "danger" });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  const columns: Column<AppealRow>[] = [
    {
      key: "appeal",
      header: "Appeal",
      mobile: "title",
      cell: (row) => {
        const effective = resolved[row.id] ?? row.status;
        const href = targetHref(row);
        return (
          <div className="flex min-w-0 flex-col gap-1.5 whitespace-normal text-left font-normal">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="rounded-pill bg-tint px-2.5 py-0.5 text-[12px] font-medium text-secondary">
                {APPEAL_KIND_LABELS[row.kind]}
              </span>
              {href ? (
                <Link
                  href={href}
                  className="cursor-pointer text-[13px] font-semibold text-accent hover:text-accent-hover"
                >
                  {row.handle}
                </Link>
              ) : (
                <span className="text-[13px] font-semibold text-ink">{row.handle}</span>
              )}
              <StatusPill
                label={APPEAL_STATUS_LABELS[effective]}
                tone={STATUS_TONE[effective]}
              />
              {row.suspended ? null : (
                <span className="rounded-pill border border-border px-2.5 py-0.5 text-[12px] text-tertiary">
                  Target isn&apos;t suspended
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-tertiary">
              <a
                href={`mailto:${row.email}`}
                className="cursor-pointer truncate text-secondary hover:text-ink"
              >
                {row.email}
              </a>
              <span aria-hidden="true">·</span>
              <span title={formatDateTimeFull(row.createdAt)}>
                {formatRelativeTime(row.createdAt)}
              </span>
              {row.reviewedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span title={formatDateTimeFull(row.reviewedAt)}>
                    closed by {row.reviewedBy ?? "an admin"}
                  </span>
                </>
              ) : null}
            </div>

            <p className="text-[13px] leading-relaxed text-secondary" title={row.message}>
              {truncate(row.message, MESSAGE_MAX)}
            </p>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "190px",
      mobile: "actions",
      cell: (row) => {
        const viewPage = row.kyteId ? (
          <ViewPageLink kyteId={row.kyteId} username={row.handle} />
        ) : null;
        if (resolved[row.id] || row.status !== "OPEN") {
          return (
            <div className="flex flex-col items-end gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-end">
              {viewPage}
              <span className="text-[12px] text-tertiary">
                {resolved[row.id] ? "Actioned this session" : "Already closed"}
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-end gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-end">
            {viewPage}
            <Button
              size="sm"
              tone="success"
              onClick={() => setPending({ row, status: "RESOLVED" })}
            >
              Resolved
            </Button>
            <Button
              size="sm"
              tone="secondary"
              onClick={() => setPending({ row, status: "DISMISSED" })}
            >
              Dismiss
            </Button>
          </div>
        );
      },
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(event) => table.setFilter("q", event.target.value)}
        placeholder="Search handle, email, or message…"
        aria-label="Search appeals"
        className="min-w-0 flex-1 rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint sm:max-w-md"
      />
      <select
        value={statusFilter}
        onChange={(event) => table.setFilter("status", event.target.value)}
        aria-label="Filter appeals by status"
        className={SELECT}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={table.dir}
        onChange={(event) => table.setSort("createdAt", event.target.value === "asc" ? "asc" : "desc")}
        aria-label="Sort appeals"
        className={SELECT}
      >
        <option value="desc">Newest first</option>
        <option value="asc">Oldest first</option>
      </select>
    </div>
  );

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        status={status}
        onRetry={reload}
        caption="Appeals people filed against a suspension"
        unit="appeals"
        empty={{
          title: "No appeals waiting.",
          description: "Anyone suspended can file one from the public appeal form.",
        }}
        pagination={{
          page: table.page,
          pageSize: table.pageSize,
          total,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        toolbar={toolbar}
      />

      {pending ? (
        <ConfirmDialog
          open
          title={
            pending.status === "RESOLVED"
              ? CONFIRM_TITLES.resolveAppeal
              : CONFIRM_TITLES.dismissAppeal
          }
          description={
            pending.status === "RESOLVED" ? RESOLVE_APPEAL_COPY : DISMISS_APPEAL_COPY
          }
          confirmLabel={pending.status === "RESOLVED" ? "Mark resolved" : "Dismiss appeal"}
          tone={pending.status === "RESOLVED" ? "default" : "warning"}
          details={[
            { label: APPEAL_KIND_LABELS[pending.row.kind], value: pending.row.handle },
            { label: "From", value: pending.row.email },
          ]}
          busy={busy}
          onConfirm={() => void runPending()}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  );
}
