import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { CopyId } from "../../ui/copy-id";
import { DataTable, type Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
} from "../../../lib/format";
import type { StorageOrphanRow } from "../../../lib/admin-source";

interface OrphansQuery {
  page: number;
  pageSize: number;
}

export function OrphansTable() {
  const source = useAdminSource();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportOpen, setExportOpen] = useState(false);

  const input = useMemo<OrphansQuery>(() => ({ page, pageSize }), [page, pageSize]);
  const run = useCallback((query: OrphansQuery) => source.storageOrphans(query), [source]);
  const { data, status, reload } = usePagedQuery(run, input);

  const columns: Column<StorageOrphanRow>[] = [
    {
      key: "org",
      header: "Org",
      mobile: "title",
      cell: (row) => <span className="font-medium text-ink">{row.orgName}</span>,
    },
    {
      key: "kyte",
      header: "Kyte",
      mobile: "meta",
      cell: (row) =>
        row.kyteUsername ? (
          <Link
            href={`/orgs/${row.orgId}/${row.kyteId}`}
            className="text-accent hover:text-accent-hover"
          >
            @{row.kyteUsername}
          </Link>
        ) : (
          <span className="text-tertiary">Unpublished kyte</span>
        ),
    },
    {
      key: "asset",
      header: "Asset",
      mobile: "detail",
      cell: (row) => <CopyId value={row.assetId} label="Asset ID" />,
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      mobile: "detail",
      cell: (row) => <span className="tabular-nums text-ink">{formatBytes(row.sizeBytes)}</span>,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      align: "right",
      mobile: "detail",
      cell: (row) => (
        <span className="text-tertiary" title={formatDateTimeFull(row.createdAt)}>
          {formatRelativeTime(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={(row) => row.assetId}
        status={status}
        onRetry={reload}
        caption="Orphaned assets with their org and kyte"
        unit="orphaned assets"
        href={(row) => `/storage/${row.orgId}`}
        empty={{
          title: "No orphaned assets",
          description: "Every file in the bucket is still referenced by published content.",
        }}
        toolbar={
          <div className="flex flex-wrap items-center justify-end gap-2">
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
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="storageOrphans"
        filters={{}}
        title="Export orphaned assets"
        scopeDescription={`${formatNumber(data?.total ?? 0)} orphaned assets`}
      />
    </>
  );
}
