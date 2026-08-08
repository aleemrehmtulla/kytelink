import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { DataTable, type Column } from "../../ui/data-table";
import { Dropdown } from "../../ui/dropdown";
import { ExportDialog } from "../../ui/export-dialog";
import { PageHeader } from "../../ui/page-header";
import { StatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import { formatDateTimeFull, formatNumber, formatRelativeTime } from "../../../lib/format";
import type { OrgSummary, SearchOrgsInput } from "../../../lib/admin-source";
import { sortHandler } from "./labels";
import { StorageMeter } from "./storage-meter";
import { TableSearch, Toolbar } from "./table-toolbar";

type OrgsQuery = Required<Pick<SearchOrgsInput, "query" | "sort" | "dir" | "page" | "pageSize">>;
type OrgSort = OrgsQuery["sort"];

const ORG_SORT_KEYS: readonly OrgSort[] = [
  "createdAt",
  "name",
  "storageBytes",
  "kyteCount",
  "memberCount",
];

export function OrgsListScreen() {
  const router = useRouter();
  const source = useAdminSource();
  const { toast } = useToast();
  const table = useTableState<OrgSort>({ sort: "createdAt", dir: "desc" }, { q: "" });
  const [exportOpen, setExportOpen] = useState(false);
  const rawQuery = table.filters.q ?? "";
  const query = useDebouncedValue(rawQuery, 250);

  const run = useCallback((next: OrgsQuery) => source.searchOrgs(next), [source]);
  const input = useMemo<OrgsQuery>(
    () => ({ query, sort: table.sort, dir: table.dir, page: table.page, pageSize: table.pageSize }),
    [query, table.sort, table.dir, table.page, table.pageSize],
  );
  const { data, status, reload } = usePagedQuery(run, input);
  const total = data?.total ?? 0;

  const columns = useMemo<Column<OrgSummary>[]>(
    () => [
      {
        key: "org",
        header: "Org",
        sortKey: "name",
        width: "34%",
        mobile: "title",
        cell: (org) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-ink">{org.name}</span>
              {org.personal ? (
                <span
                  className="shrink-0 rounded-pill bg-tint px-2 py-0.5 text-[11px] font-medium text-tertiary"
                  title="Created automatically when this person signed up, not a shared workspace"
                >
                  Personal
                </span>
              ) : null}
            </span>
            <span className="truncate text-[12px] text-tertiary">{org.ownerEmail}</span>
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        mobile: "meta",
        headerHint: "A suspended org takes every kyte in it offline",
        cell: (org) =>
          org.suspendedAt === null ? (
            <StatusPill label="Live" tone="success" />
          ) : (
            <span title={`Suspended ${formatDateTimeFull(org.suspendedAt)}`}>
              <StatusPill label="Suspended" tone="warning" />
            </span>
          ),
      },
      {
        key: "kytes",
        header: "Kytes",
        align: "right",
        sortKey: "kyteCount",
        mobile: "detail",
        headerHint: "Published of total",
        cell: (org) => (
          <span
            className="tabular-nums text-ink"
            title={`${formatNumber(org.publishedKyteCount)} published of ${formatNumber(
              org.kyteCount,
            )} total`}
          >
            {formatNumber(org.publishedKyteCount)}
            <span className="text-faint"> / {formatNumber(org.kyteCount)}</span>
          </span>
        ),
      },
      {
        key: "members",
        header: "Members",
        align: "right",
        sortKey: "memberCount",
        mobile: "detail",
        cell: (org) => (
          <span className="tabular-nums text-ink">{formatNumber(org.memberCount)}</span>
        ),
      },
      {
        key: "storage",
        header: "Storage",
        align: "right",
        width: "140px",
        sortKey: "storageBytes",
        mobile: "detail",
        headerHint: "Amber past 80% of the org's limit, red once over",
        cell: (org) => <StorageMeter bytes={org.storageBytes} limitBytes={org.storageLimitBytes} />,
      },
      {
        key: "createdAt",
        header: "Created",
        align: "right",
        sortKey: "createdAt",
        mobile: "meta",
        cell: (org) => (
          <span className="text-tertiary" title={formatDateTimeFull(org.createdAt)}>
            {formatRelativeTime(org.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        width: "56px",
        mobile: "actions",
        cell: (org) => (
          <Dropdown
            align="end"
            label={`Actions for ${org.name}`}
            trigger={<span aria-hidden="true">···</span>}
            items={[
              { key: "view", label: "View org", onSelect: () => void router.push(`/orgs/${org.id}`) },
              {
                key: "copy",
                label: "Copy org ID",
                hint: org.id,
                onSelect: () => {
                  void navigator.clipboard.writeText(org.id);
                  toast("Org ID copied.");
                },
              },
              {
                key: "storage",
                label: "View in storage",
                onSelect: () => void router.push(`/storage/${org.id}`),
              },
              {
                key: "email",
                label: "Email owner",
                hint: org.ownerEmail,
                onSelect: () => {
                  window.location.href = `mailto:${org.ownerEmail}`;
                },
              },
            ]}
          />
        ),
      },
    ],
    [router, toast],
  );

  return (
    <>
      <PageHeader
        title="Orgs & kytes"
        description="Every workspace on the platform — what it holds, who owns it, and how close it is to its ceilings."
      />

      <DataTable<OrgSummary>
        caption="Organizations"
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={(org) => org.id}
        status={status}
        onRetry={reload}
        href={(org) => `/orgs/${org.id}`}
        sort={{ key: table.sort, dir: table.dir }}
        unit="orgs"
        onSortChange={sortHandler(ORG_SORT_KEYS, table.setSort)}
        empty={{
          title: rawQuery ? "No orgs match that search." : "No orgs yet.",
          description: rawQuery
            ? "Try the owner's email address, or paste an org ID."
            : "Orgs appear here as soon as someone signs up.",
        }}
        pagination={{
          page: table.page,
          pageSize: table.pageSize,
          total,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
        toolbar={
          <Toolbar>
            <TableSearch
              id="orgs-search"
              value={rawQuery}
              onChange={(next) => table.setFilter("q", next)}
              placeholder="Search by org name, owner email, or org ID"
              label="Search orgs"
            />
            <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
              Export
            </Button>
          </Toolbar>
        }
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="orgs"
        filters={{ query, sort: table.sort, dir: table.dir }}
        title="Export orgs"
        scopeDescription={`${formatNumber(total)} orgs matching your filters`}
      />
    </>
  );
}
