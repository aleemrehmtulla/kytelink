import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "../../ui/button";
import { copyText } from "../../ui/clipboard";
import { DataTable, type Column } from "../../ui/data-table";
import { Dropdown } from "../../ui/dropdown";
import { ExportDialog } from "../../ui/export-dialog";
import { PageHeader } from "../../ui/page-header";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatPercentPoints,
  formatRelativeTime,
} from "../../../lib/format";
import type { StorageOrgRow, StorageOrgsInput } from "../../../lib/admin-source";
import { EmailOwnerModal } from "./email-owner-modal";
import { StorageMeter } from "./storage-meter";

type OrgSort = NonNullable<StorageOrgsInput["sort"]>;

type OrgsQuery = Required<
  Pick<StorageOrgsInput, "page" | "pageSize" | "query" | "sort" | "dir" | "overLimitOnly">
>;

const SORT_OPTIONS: { value: string; label: string; sort: OrgSort; dir: "asc" | "desc" }[] = [
  { value: "bytes:desc", label: "Largest storage first", sort: "bytes", dir: "desc" },
  { value: "bytes:asc", label: "Smallest storage first", sort: "bytes", dir: "asc" },
  { value: "pctOfLimit:desc", label: "Closest to their limit", sort: "pctOfLimit", dir: "desc" },
  { value: "assetCount:desc", label: "Most files", sort: "assetCount", dir: "desc" },
  { value: "orgName:asc", label: "Name A–Z", sort: "orgName", dir: "asc" },
];

const FILTER_DEFAULTS = { q: "", overLimit: "" };

export function StorageOrgsScreen() {
  const source = useAdminSource();
  const router = useRouter();
  const { toast } = useToast();


  const { page, pageSize, sort, dir, filters, setPage, setPageSize, setSort, setFilter } =
    useTableState<OrgSort>({ sort: "bytes", dir: "desc" }, FILTER_DEFAULTS);
  const query = filters.q ?? "";
  const debouncedQuery = useDebouncedValue(query, 250);
  const overLimitOnly = filters.overLimit === "1";
  const [exportOpen, setExportOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<StorageOrgRow | null>(null);

  const input = useMemo<OrgsQuery>(
    () => ({ page, pageSize, query: debouncedQuery, sort, dir, overLimitOnly }),
    [page, pageSize, debouncedQuery, sort, dir, overLimitOnly],
  );
  const runOrgs = useCallback((next: OrgsQuery) => source.storageOrgs(next), [source]);
  const { data, status, reload } = usePagedQuery(runOrgs, input);

  async function copyOrgId(orgId: string) {
    const ok = await copyText(orgId);
    toast(ok ? "Org ID copied." : "Couldn’t copy the org ID.", {
      tone: ok ? "success" : "danger",
    });
  }

  const columns: Column<StorageOrgRow>[] = [
    {
      key: "org",
      header: "Org",
      sortKey: "orgName",
      mobile: "title",
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink">{row.orgName}</span>
          <span className="truncate text-[12px] text-tertiary">{row.ownerEmail}</span>
        </span>
      ),
    },
    {
      key: "usage",
      header: "Usage",
      sortKey: "bytes",
      width: "190px",
      mobile: "detail",
      cell: (row) =>
        row.limitBytes !== null && row.pctOfLimit !== null ? (
          <span className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-baseline gap-1.5">
              <span className="tabular-nums text-ink">{formatBytes(row.bytes)}</span>
              <span className="text-[12px] text-tertiary">
                {formatPercentPoints(row.pctOfLimit)} of {formatBytes(row.limitBytes)}
              </span>
            </span>
            <StorageMeter
              pctOfLimit={row.pctOfLimit}
              label={`${row.orgName} storage used, ${formatPercentPoints(row.pctOfLimit)} of ${formatBytes(row.limitBytes)}`}
            />
          </span>
        ) : (
          <span className="flex flex-wrap items-baseline gap-1.5">
            <span className="tabular-nums text-ink">{formatBytes(row.bytes)}</span>
            <span className="text-[12px] text-faint">no limit</span>
          </span>
        ),
    },
    {
      key: "pctOfTotal",
      header: "% of platform",
      align: "right",
      mobile: "detail",
      headerHint: "Share of everything stored in the bucket",
      cell: (row) => (
        <span className="tabular-nums text-secondary">{formatPercentPoints(row.pctOfTotal)}</span>
      ),
    },
    {
      key: "assetCount",
      header: "Files",
      align: "right",
      sortKey: "assetCount",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums text-secondary">{formatNumber(row.assetCount)}</span>,
    },
    {
      key: "kyteCount",
      header: "Kytes",
      align: "right",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums text-secondary">{formatNumber(row.kyteCount)}</span>,
    },
    {
      key: "largestAssetBytes",
      header: "Largest file",
      align: "right",
      mobile: "detail",
      cell: (row) => (
        <span className="tabular-nums text-secondary">{formatBytes(row.largestAssetBytes)}</span>
      ),
    },
    {
      key: "lastUploadAt",
      header: "Last upload",
      align: "right",
      mobile: "meta",
      cell: (row) =>
        row.lastUploadAt ? (
          <span className="text-tertiary" title={formatDateTimeFull(row.lastUploadAt)}>
            {formatRelativeTime(row.lastUploadAt)}
          </span>
        ) : (
          <span className="text-faint">Never</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "48px",
      mobile: "actions",
      cell: (row) => (
        <Dropdown
          align="end"
          label={`Actions for ${row.orgName}`}
          trigger={<span aria-hidden="true">⋯</span>}
          items={[
            {
              key: "files",
              label: "See files",
              onSelect: () => {
                void router.push(`/storage/${row.orgId}`);
              },
            },
            { key: "email", label: "Email owner", onSelect: () => setEmailTarget(row) },
            {
              key: "org",
              label: "View org",
              onSelect: () => {
                void router.push(`/orgs/${row.orgId}`);
              },
            },
            { key: "copy", label: "Copy org ID", onSelect: () => void copyOrgId(row.orgId) },
          ]}
        />
      ),
    },
  ];


  return (
    <>
      <PageHeader
        title="Storage by org"
        breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: "By org" }]}
        description="Every org ranked by what it holds. Open one to see which files are doing it."
      />

      <DataTable
          rows={data?.rows ?? []}
          columns={columns}
          rowKey={(row) => row.orgId}
          status={status}
          onRetry={reload}
          caption="Organizations by storage used, with owner email and limit"
          unit="orgs"
          href={(row) => `/storage/${row.orgId}`}
          sort={{ key: sort, dir }}
          onSortChange={(key, nextDir) => setSort(key as OrgSort, nextDir)}
          empty={{
            title: overLimitOnly ? "No org is over its limit" : "No orgs match that search",
            description: overLimitOnly
              ? "Nobody has passed their storage limit right now."
              : "Try an org name or an owner’s email address.",
          }}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setFilter("q", event.target.value)}
                placeholder="Search org name or owner email…"
                aria-label="Search orgs by name or owner email"
                className="min-w-[200px] flex-1 rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-pill border border-border bg-card px-3 py-2 text-[13px] text-secondary">
                <input
                  type="checkbox"
                  checked={overLimitOnly}
                  onChange={(event) => setFilter("overLimit", event.target.checked ? "1" : "")}
                  className="cursor-pointer accent-accent"
                />
                Over limit only
              </label>
              <label className="flex items-center gap-2 text-[13px] text-tertiary">
                <span className="sr-only">Sort orgs</span>
                <select
                  value={`${sort}:${dir}`}
                  onChange={(event) => {
                    const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
                    if (!option) return;
                    setSort(option.sort, option.dir);
                  }}
                  className="cursor-pointer rounded-input border border-border bg-card px-2.5 py-2 text-[13px] text-ink"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
                Export
              </Button>
            </div>
          }
          pagination={{
            page,
            pageSize,
            total: data?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="storageOrgs"
        filters={{ query: debouncedQuery, sort, dir, overLimitOnly }}
        title="Export storage by org"
        scopeDescription={`${formatNumber(data?.total ?? 0)} orgs matching your filters`}
      />

      {emailTarget ? (
        <EmailOwnerModal
          open
          onClose={() => setEmailTarget(null)}
          ownerEmail={emailTarget.ownerEmail}
          orgName={emailTarget.orgName}
          totalBytes={emailTarget.bytes}
          limitBytes={emailTarget.limitBytes}
          assetCount={emailTarget.assetCount}
        />
      ) : null}
    </>
  );
}
