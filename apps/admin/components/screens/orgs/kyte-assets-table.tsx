import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { DataTable, type Column } from "../../ui/data-table";
import { Section } from "../../ui/section";
import {
  formatBytes,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  nonBlank,
} from "../../../lib/format";
import type { KyteAssetRow } from "../../../lib/admin-source";
import { ASSET_KIND_LABELS } from "./labels";

const PAGE_SIZE = 10;

export interface KyteAssetsTableProps {
  assets: KyteAssetRow[];
  totalBytes: number;
  onDelete: (assetId: string, reason: string) => Promise<void>;
}

export function KyteAssetsTable({ assets, totalBytes, onDelete }: KyteAssetsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pendingAsset, setPendingAsset] = useState<KyteAssetRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deleting the last file on a page shrinks `assets` under a `page` that no
  // longer exists, which renders an empty state above "showing 11-11 of 10".
  const lastPage = Math.max(1, Math.ceil(assets.length / pageSize));
  const effectivePage = Math.min(page, lastPage);
  const pageRows = useMemo(
    () => assets.slice((effectivePage - 1) * pageSize, effectivePage * pageSize),
    [assets, effectivePage, pageSize],
  );

  const columns = useMemo<Column<KyteAssetRow>[]>(
    () => [
      {
        key: "kind",
        header: "File",
        mobile: "title",
        cell: (asset) => (
          <span className="font-medium text-ink">{ASSET_KIND_LABELS[asset.kind]}</span>
        ),
      },
      {
        key: "dimensions",
        header: "Dimensions",
        align: "right",
        mobile: "detail",
        cell: (asset) =>
          asset.width !== null && asset.height !== null ? (
            <span className="tabular-nums text-secondary">
              {formatNumber(asset.width)} × {formatNumber(asset.height)}
            </span>
          ) : (
            <span className="text-faint">—</span>
          ),
      },
      {
        key: "contentType",
        header: "Type",
        mobile: "meta",
        cell: (asset) => <span className="text-secondary">{asset.contentType}</span>,
      },
      {
        key: "size",
        header: "Size",
        align: "right",
        mobile: "detail",
        cell: (asset) => <span className="tabular-nums text-ink">{formatBytes(asset.sizeBytes)}</span>,
      },
      {
        key: "uploader",
        header: "Uploaded by",
        mobile: "detail",
        cell: (asset) =>
          asset.uploaderEmail ? (
            <span className="truncate text-secondary">{asset.uploaderEmail}</span>
          ) : (
            <span className="text-faint">Unknown</span>
          ),
      },
      {
        key: "createdAt",
        header: "Uploaded",
        align: "right",
        mobile: "detail",
        cell: (asset) => (
          <span className="text-tertiary" title={formatDateTime(asset.createdAt)}>
            {formatRelativeTime(asset.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        width: "88px",
        mobile: "actions",
        cell: (asset) => (
          <Button
            tone="danger"
            size="sm"
            onClick={() => {
              setError(null);
              setPendingAsset(asset);
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [],
  );

  async function confirmDelete(reason: string) {
    if (!pendingAsset) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(pendingAsset.id, reason);
      setPendingAsset(null);
    } catch {
      setError("Couldn't delete that file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Files"
      description={`${formatNumber(assets.length)} uploads · ${formatBytes(totalBytes)} against this org's storage limit.`}
    >
      <DataTable<KyteAssetRow>
        caption="Uploaded files"
        unit="files"
        rows={pageRows}
        columns={columns}
        rowKey={(asset) => asset.id}
        status="success"
        empty={{
          title: "No uploaded files.",
          description: "Avatars, link images, and social previews show up here.",
        }}
        pagination={{
          page: effectivePage,
          pageSize,
          total: assets.length,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
      />

      <ConfirmDialog
        open={pendingAsset !== null}
        title="Delete this file?"
        description={
          pendingAsset
            ? `Delete this ${ASSET_KIND_LABELS[pendingAsset.kind].toLowerCase()}? The file leaves storage for good and any block pointing at it loses its image. The owner is not told.`
            : ""
        }
        confirmLabel="Delete file"
        tone="danger"
        requireReason
        reasonLabel="Reason (recorded in the audit log)"
        reasonPlaceholder="e.g. phishing links in bio — reported 4×"
        details={
          pendingAsset
            ? [
                { label: "Kind", value: ASSET_KIND_LABELS[pendingAsset.kind] },
                { label: "Size", value: formatBytes(pendingAsset.sizeBytes) },
                { label: "Type", value: pendingAsset.contentType },
                { label: "Uploaded by", value: nonBlank(pendingAsset.uploaderEmail) ?? "Unknown" },
              ]
            : undefined
        }
        busy={busy}
        error={error}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingAsset(null);
          setError(null);
        }}
      />
    </Section>
  );
}
