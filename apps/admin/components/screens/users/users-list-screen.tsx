import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import type { UserStatus } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { copyText } from "../../ui/clipboard";
import { DataTable, type Column } from "../../ui/data-table";
import { Dropdown, type DropdownProps } from "../../ui/dropdown";
import { ExportDialog } from "../../ui/export-dialog";
import { PageHeader } from "../../ui/page-header";
import { UserStatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminMe } from "../../../hooks/use-admin-me";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
  personLabel,
} from "../../../lib/format";
import type { UserSortKey, UserSummary } from "../../../lib/admin-source";
import { UserAvatar } from "./user-avatar";
import { UserStatusDialog, type UserStatusIntent } from "./user-status-dialog";
import { UserStatusFilter, type UserStatusFilterValue } from "./user-status-filter";

const USER_SORT_KEYS = [
  "createdAt",
  "email",
  "name",
  "storageBytes",
  "orgCount",
] as const satisfies readonly NonNullable<UserSortKey>[];

type UsersSort = (typeof USER_SORT_KEYS)[number];

function isUsersSort(key: string): key is UsersSort {
  return (USER_SORT_KEYS as readonly string[]).includes(key);
}

interface UsersQueryInput {
  query: string;
  status?: UserStatus;
  sort: UsersSort;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

interface StatusOverride {
  status: UserStatus;
  statusReason: string | null;
}

interface PendingStatusChange {
  intent: UserStatusIntent;
  ids: string[];
  status: UserStatus;
  present: string;
  past: string;
}

function isStatusFilter(value: string): value is UserStatusFilterValue {
  return value === "ALL" || value === "ACTIVE" || value === "SUSPENDED";
}

export function UsersListScreen() {
  const source = useAdminSource();
  const me = useAdminMe();
  const router = useRouter();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, StatusOverride>>({});
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const table = useTableState<UsersSort>(
    { sort: "createdAt", dir: "desc" },
    { q: "", status: "ALL" },
  );

  const rawQuery = table.filters.q ?? "";
  const debouncedQuery = useDebouncedValue(rawQuery, 250);
  const filterValue = table.filters.status ?? "ALL";
  const statusFilter: UserStatusFilterValue = isStatusFilter(filterValue) ? filterValue : "ALL";

  const input = useMemo<UsersQueryInput>(
    () => ({
      query: debouncedQuery,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      sort: table.sort,
      dir: table.dir,
      page: table.page,
      pageSize: table.pageSize,
    }),
    [debouncedQuery, statusFilter, table.sort, table.dir, table.page, table.pageSize],
  );

  const runSearch = useCallback((next: UsersQueryInput) => source.searchUsers(next), [source]);
  const { data, status, reload } = usePagedQuery(runSearch, input);

  const viewKey = `${debouncedQuery}|${statusFilter}|${table.page}|${table.pageSize}|${table.sort}|${table.dir}`;
  const [lastViewKey, setLastViewKey] = useState(viewKey);
  if (viewKey !== lastViewKey) {
    setLastViewKey(viewKey);
    if (selected.size > 0) setSelected(new Set());
    setOverrides({});
    setActionError(null);
  }

  const rows = useMemo<UserSummary[]>(() => {
    const fetched = data?.rows ?? [];
    return fetched.map((row) => {
      const override = overrides[row.id];
      return override ? { ...row, ...override } : row;
    });
  }, [data, overrides]);

  const total = data?.total ?? 0;
  const rowsById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  async function applyStatusChange(change: PendingStatusChange, reason: string) {
    const before = new Map<string, StatusOverride>();
    for (const id of change.ids) {
      const row = rowsById.get(id);
      if (row) before.set(id, { status: row.status, statusReason: row.statusReason });
    }

    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of change.ids) next[id] = { status: change.status, statusReason: reason };
      return next;
    });
    setBusy(true);
    setActionError(null);

    const results = await Promise.allSettled(
      change.ids.map((userId) => source.setUserStatus({ userId, status: change.status, reason })),
    );
    const failed = change.ids.filter((_, index) => results[index]?.status === "rejected");

    if (failed.length > 0) {
      setOverrides((prev) => {
        const next = { ...prev };
        for (const id of failed) {
          const previous = before.get(id);
          if (previous) next[id] = previous;
          else delete next[id];
        }
        return next;
      });
      if (change.ids.length > 1) {
        setSelected(new Set(failed));
        setActionError(`${failed.length} of ${change.ids.length} failed. They stay selected.`);
        setPending(null);
      } else {
        setActionError(`Couldn't ${change.present} this account. Try again.`);
      }
      toast(
        change.ids.length === 1
          ? `Couldn't ${change.present} this account.`
          : `Couldn't ${change.present} ${failed.length} of ${change.ids.length} accounts.`,
        { tone: "danger" },
      );
    } else {
      setSelected(new Set());
      setPending(null);
      const first = rowsById.get(change.ids[0] ?? "");
      toast(
        change.ids.length === 1 && first
          ? `${change.past} ${first.email}.`
          : `${change.past} ${formatNumber(change.ids.length)} accounts.`,
      );
    }

    setBusy(false);
    reload();
  }

  async function forceLogout(ids: string[]) {
    setBusy(true);
    setActionError(null);
    const results = await Promise.allSettled(ids.map((userId) => source.forceLogoutUser(userId)));
    const failed = ids.filter((_, index) => results[index]?.status === "rejected");
    if (failed.length > 0) {
      setSelected(new Set(failed));
      setActionError(`${failed.length} of ${ids.length} failed. They stay selected.`);
      toast(`Couldn't sign out ${failed.length} of ${ids.length} accounts.`, { tone: "danger" });
    } else {
      setSelected(new Set());
      toast(
        ids.length === 1
          ? "Signed out of every device."
          : `Signed ${formatNumber(ids.length)} accounts out of every device.`,
      );
    }
    setBusy(false);
  }

  async function copyEmail(email: string) {
    const copied = await copyText(email);
    if (copied) toast(`Copied ${email}.`);
    else toast("Couldn't copy the email address.", { tone: "danger" });
  }

  function rowItems(row: UserSummary): DropdownProps["items"] {
    const isSelf = me.userId === row.id;
    const selfHint = isSelf ? "You can't change your own account status." : undefined;
    const items: DropdownProps["items"] = [
      { key: "view", label: "View user", onSelect: () => void router.push(`/users/${row.id}`) },
      { key: "copy", label: "Copy email", onSelect: () => void copyEmail(row.email) },
      {
        key: "logout",
        label: "Force logout",
        disabled: busy,
        onSelect: () => void forceLogout([row.id]),
      },
      { key: "sep", separator: true },
    ];

    if (row.status === "ACTIVE") {
      items.push({
        key: "suspend",
        label: "Suspend user…",
        tone: "danger",
        disabled: isSelf || busy,
        ...(selfHint ? { hint: selfHint } : {}),
        onSelect: () =>
          setPending({
            intent: {
              kind: "suspend",
              email: row.email,
              orgCount: row.orgCount,
              kyteCount: row.kyteCount,
            },
            ids: [row.id],
            status: "SUSPENDED",
            present: "suspend",
            past: "Suspended",
          }),
      });
    } else {
      items.push({
        key: "restore",
        label: "Restore account…",
        disabled: busy,
        onSelect: () =>
          setPending({
            intent: { kind: "restore", email: row.email },
            ids: [row.id],
            status: "ACTIVE",
            present: "restore",
            past: "Restored",
          }),
      });
    }

    return items;
  }

  const columns: Column<UserSummary>[] = [
    {
      key: "account",
      header: "Account",
      width: "32%",
      sortKey: "email",
      headerHint: "Sorts by email address",
      mobile: "title",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.name} email={row.email} />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {personLabel(row.name, row.email)}
            </span>
            {row.name ? (
              <span className="block truncate text-[12px] text-tertiary">{row.email}</span>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "20%",
      mobile: "meta",
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <UserStatusPill status={row.status} />
          {row.status !== "ACTIVE" && row.statusReason ? (
            <span className="block max-w-[24ch] truncate text-[12px] text-tertiary" title={row.statusReason}>
              {row.statusReason}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "orgCount",
      header: "Orgs",
      align: "right",
      width: "8%",
      sortKey: "orgCount",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums">{formatNumber(row.orgCount)}</span>,
    },
    {
      key: "kyteCount",
      header: "Kytes",
      align: "right",
      width: "8%",
      headerHint: "Kytes across every org they belong to",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums">{formatNumber(row.kyteCount)}</span>,
    },
    {
      key: "storageBytes",
      header: "Storage",
      align: "right",
      width: "11%",
      sortKey: "storageBytes",
      headerHint: "Uploads in the orgs they own",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums">{formatBytes(row.storageBytes)}</span>,
    },
    {
      key: "createdAt",
      header: "Signed up",
      align: "right",
      width: "13%",
      sortKey: "createdAt",
      mobile: "detail",
      cell: (row) => (
        <span className="tabular-nums" title={formatDateTimeFull(row.createdAt)}>
          {formatRelativeTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "56px",
      mobile: "actions",
      cell: (row) => (
        <Dropdown
          align="end"
          label={`Actions for ${row.email}`}
          trigger={
            <span aria-hidden="true" className="text-[16px] leading-none text-tertiary">
              ⋯
            </span>
          }
          items={rowItems(row)}
        />
      ),
    },
  ];

  const hasFilters = debouncedQuery.trim().length > 0 || statusFilter !== "ALL";
  const empty = debouncedQuery.trim().length > 0
    ? {
        title: `No users match “${debouncedQuery.trim()}”`,
        description: "Search matches email addresses, names, and user IDs.",
        action: (
          <Button size="sm" tone="secondary" onClick={() => table.setFilter("q", "")}>
            Clear search
          </Button>
        ),
      }
    : statusFilter !== "ALL"
      ? {
          title: "No accounts with this status",
          description: "Nothing to moderate here right now.",
          action: (
            <Button size="sm" tone="secondary" onClick={() => table.setFilter("status", "ALL")}>
              Show all accounts
            </Button>
          ),
        }
      : {
          title: "No accounts yet",
          description: "Everyone who signs up shows up here, newest first.",
        };

  const selectedIds = [...selected];
  // Already-suspended rows are skipped rather than re-posted: a second SUSPEND
  // would overwrite the original reason in the audit trail with this bulk one.
  const suspendableIds = (data?.rows ?? [])
    .filter((row) => selected.has(row.id) && row.status === "ACTIVE")
    .map((row) => row.id);

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on this platform, with its standing, footprint, and signup date."
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        status={status}
        onRetry={reload}
        empty={empty}
        caption="Users, with account status, org and kyte counts, storage use, and signup date"
        unit="users"
        sort={{ key: table.sort, dir: table.dir }}
        onSortChange={(key, dir) => {
          if (isUsersSort(key)) table.setSort(key, dir);
        }}
        href={(row) => `/users/${row.id}`}
        selection={{
          selected,
          onChange: setSelected,
          disabled: (row) => me.userId === row.id,
        }}
        pagination={{
          page: table.page,
          pageSize: table.pageSize,
          total,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={rawQuery}
              onChange={(event) => table.setFilter("q", event.target.value)}
              placeholder="Search by email, name, or user ID"
              aria-label="Search users"
              className="h-[38px] w-full max-w-xs rounded-input border border-border bg-card px-3 text-[13px] text-ink placeholder:text-faint"
            />
            <UserStatusFilter
              value={statusFilter}
              onChange={(next) => table.setFilter("status", next)}
            />
            <span className="ml-auto">
              <Button size="sm" tone="secondary" onClick={() => setExporting(true)}>
                Export
              </Button>
            </span>
          </div>
        }
        bulkBar={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-medium text-ink">
              {formatNumber(selected.size)} selected
            </span>
            <Button size="sm" tone="secondary" busy={busy} onClick={() => void forceLogout(selectedIds)}>
              Force logout
            </Button>
            <Button
              size="sm"
              tone="danger"
              busy={busy}
              disabled={suspendableIds.length === 0}
              onClick={() =>
                setPending({
                  intent: { kind: "bulk-suspend", count: suspendableIds.length },
                  ids: suspendableIds,
                  status: "SUSPENDED",
                  present: "suspend",
                  past: "Suspended",
                })
              }
            >
              Suspend…
            </Button>
            <Button size="sm" tone="ghost" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
            {actionError ? <span className="text-[12px] text-danger">{actionError}</span> : null}
          </div>
        }
      />

      <UserStatusDialog
        intent={pending?.intent ?? null}
        busy={busy}
        error={actionError}
        onConfirm={(reason) => {
          if (pending) void applyStatusChange(pending, reason);
        }}
        onCancel={() => setPending(null)}
      />

      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        dataset="users"
        title="Export users"
        filters={{
          query: debouncedQuery,
          ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
          sort: table.sort,
          dir: table.dir,
        }}
        scopeDescription={`${formatNumber(total)} ${total === 1 ? "user" : "users"} ${
          hasFilters ? "matching your filters" : "on this platform"
        }`}
      />
    </>
  );
}
