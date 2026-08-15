import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LIMIT_DEFAULTS } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { CopyId } from "../../ui/copy-id";
import { DataTable, type Column } from "../../ui/data-table";
import { DetailList } from "../../ui/detail-list";
import { ErrorState } from "../../ui/error-state";
import { ExportDialog } from "../../ui/export-dialog";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { Section } from "../../ui/section";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import { useTableState } from "../../../hooks/use-table-state";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatPercentPoints,
  formatRelativeTime,
} from "../../../lib/format";
import type { StorageFileRow, StorageOrgFilesInput } from "../../../lib/admin-source";
import { AssetThumb } from "../orgs/asset-thumb";
import { AssetViewer } from "../orgs/asset-viewer";
import { EmailOwnerModal } from "./email-owner-modal";
import { RaiseLimitModal } from "./raise-limit-modal";
import { StorageMeter } from "./storage-meter";
import {
  FILE_KINDS,
  FILE_KIND_LABELS,
  fileDimensions,
  isFileKind,
  type FileKind,
} from "./storage-format";

type FileSort = NonNullable<StorageOrgFilesInput["sort"]>;

interface FilesQuery {
  orgId: string;
  page: number;
  pageSize: number;
  sort: FileSort;
  dir: "asc" | "desc";
  kyteId?: string;
  kind?: FileKind;
}

const SORT_OPTIONS: { value: string; label: string; sort: FileSort; dir: "asc" | "desc" }[] = [
  { value: "sizeBytes:desc", label: "Largest first", sort: "sizeBytes", dir: "desc" },
  { value: "sizeBytes:asc", label: "Smallest first", sort: "sizeBytes", dir: "asc" },
  { value: "createdAt:desc", label: "Newest first", sort: "createdAt", dir: "desc" },
  { value: "createdAt:asc", label: "Oldest first", sort: "createdAt", dir: "asc" },
];

const EMPHASIZED_ROWS = 3;

const FILTER_DEFAULTS = { kyte: "", kind: "" };

export interface StorageOrgScreenProps {
  orgId: string;
}

export function StorageOrgScreen({ orgId }: StorageOrgScreenProps) {
  const source = useAdminSource();
  const { page, pageSize, sort, dir, filters, setPage, setPageSize, setSort, setFilter } =
    useTableState<FileSort>({ sort: "sizeBytes", dir: "desc" }, FILTER_DEFAULTS);
  const kyteId = filters.kyte ?? "";
  const rawKind = filters.kind ?? "";
  const kind: FileKind | "" = isFileKind(rawKind) ? rawKind : "";
  const [exportOpen, setExportOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [viewing, setViewing] = useState<StorageFileRow | null>(null);
  const [existence, setExistence] = useState<"unknown" | "missing" | "exists">("unknown");

  const input = useMemo<FilesQuery>(() => {
    const next: FilesQuery = { orgId, page, pageSize, sort, dir };
    if (kyteId) next.kyteId = kyteId;
    if (kind) next.kind = kind;
    return next;
  }, [orgId, page, pageSize, sort, dir, kyteId, kind]);
  const runFiles = useCallback((next: FilesQuery) => source.storageOrgFiles(next), [source]);
  const { data, status, reload } = usePagedQuery(runFiles, input);

  const fetchKytes = useCallback(
    () => source.orgKytes({ orgId, page: 1, pageSize: 100, sort: "storageBytes", dir: "desc" }),
    [source, orgId],
  );
  const { data: kytes } = useAsync(fetchKytes);

  const [probedOrgId, setProbedOrgId] = useState(orgId);
  if (probedOrgId !== orgId) {
    setProbedOrgId(orgId);
    setExistence("unknown");
  }

  useEffect(() => {
    if (status !== "error" || existence !== "unknown") return;
    let cancelled = false;
    source
      .orgDetail(orgId)
      .then((detail) => {
        if (!cancelled) setExistence(detail ? "exists" : "missing");
      })
      .catch(() => {
        if (!cancelled) setExistence("exists");
      });
    return () => {
      cancelled = true;
    };
  }, [status, existence, source, orgId]);

  if (!data && status === "error" && existence === "missing") {
    return (
      <>
        <PageHeader
          title="Org not found"
          breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: "Not found" }]}
        />
        <Section title="Nothing here">
          <p className="text-[13px] leading-relaxed text-secondary">
            No organization with that ID exists — it may have been deleted since this link was
            copied.
          </p>
          <p className="mt-3">
            <Link href="/storage" className="text-[13px] text-accent hover:text-accent-hover">
              Back to storage
            </Link>
          </p>
        </Section>
      </>
    );
  }

  if (!data && status === "error" && existence === "exists") {
    return (
      <>
        <PageHeader
          title="Storage"
          breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: "Org files" }]}
        />
        <ErrorState message="Couldn’t load this org’s files." onRetry={reload} />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader
          title="Storage"
          breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: "Org files" }]}
        />
        <LoadingState rows={6} />
      </>
    );
  }

  const org = data.org;
  const effectiveLimit = org.limitBytes ?? LIMIT_DEFAULTS.storageBytesPerOrg;
  const pctOfLimit = effectiveLimit > 0 ? (org.totalBytes / effectiveLimit) * 100 : 0;
  const filtered = Boolean(kyteId || kind);

  // Only page 1 of a size-descending, unfiltered list actually shows the org's
  // biggest files. Anywhere else these are just "the biggest rows you happen to
  // be looking at" — fine to emphasise, but never safe to quote to an owner.
  const showingTrueLargest = sort === "sizeBytes" && dir === "desc" && page === 1;
  const largestOnPage = [...data.rows]
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, EMPHASIZED_ROWS);
  const emphasized = new Set(
    showingTrueLargest ? largestOnPage.map((row) => row.assetId) : [],
  );
  const largestForEmail = showingTrueLargest && !filtered ? largestOnPage : [];

  const columns: Column<StorageFileRow>[] = [
    {
      key: "file",
      header: "File",
      mobile: "title",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <AssetThumb url={row.url} kind={row.kind} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{FILE_KIND_LABELS[row.kind]}</span>
              {row.orphaned ? (
                <span className="rounded-pill border border-warning-border bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                  Orphaned
                </span>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-[12px] text-tertiary">
              <span>{row.contentType}</span>
              <CopyId value={row.assetId} label="Asset ID" />
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "kyte",
      header: "Kyte",
      mobile: "meta",
      cell: (row) =>
        row.kyteUsername ? (
          <Link href={`/orgs/${orgId}/${row.kyteId}`} className="text-accent hover:text-accent-hover">
            @{row.kyteUsername}
          </Link>
        ) : (
          <Link href={`/orgs/${orgId}/${row.kyteId}`} className="text-tertiary hover:text-ink">
            Unpublished kyte
          </Link>
        ),
    },
    {
      key: "sizeBytes",
      header: "Size",
      align: "right",
      sortKey: "sizeBytes",
      mobile: "detail",
      cell: (row) => (
        <span
          className={`tabular-nums ${emphasized.has(row.assetId) ? "font-semibold text-ink" : "text-secondary"}`}
        >
          {formatBytes(row.sizeBytes)}
        </span>
      ),
    },
    {
      key: "dimensions",
      header: "Dimensions",
      align: "right",
      mobile: "detail",
      cell: (row) => (
        <span className="tabular-nums text-tertiary">{fileDimensions(row.width, row.height)}</span>
      ),
    },
    {
      key: "uploader",
      header: "Uploaded by",
      mobile: "detail",
      cell: (row) =>
        row.uploaderEmail ? (
          <span className="text-secondary">{row.uploaderEmail}</span>
        ) : (
          <span className="text-faint">Unknown</span>
        ),
    },
    {
      key: "createdAt",
      header: "Uploaded",
      align: "right",
      sortKey: "createdAt",
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
      <PageHeader
        title={org.orgName}
        description="Every file this org has uploaded, biggest first."
        breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: org.orgName }]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" size="sm" onClick={() => setLimitOpen(true)}>
              Raise limit
            </Button>
            <Button tone="secondary" size="sm" onClick={() => setEmailOpen(true)}>
              Email owner
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <Section title="Usage">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-tertiary">Total stored</span>
              <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">
                {formatBytes(org.totalBytes)}
              </span>
              <StorageMeter
                size="lg"
                pctOfLimit={pctOfLimit}
                label={`${org.orgName} storage used, ${formatPercentPoints(pctOfLimit)} of ${formatBytes(effectiveLimit)}`}
              />
              <span className="text-[12px] text-secondary">
                {formatPercentPoints(pctOfLimit)} of {formatBytes(effectiveLimit)}
                {org.limitBytes === null ? " (default limit)" : " (limit raised by an admin)"}
              </span>
            </div>
            <DetailList
              items={[
                { label: "Files", value: formatNumber(org.assetCount) },
                { label: "Kytes", value: formatNumber(org.kyteCount) },
                {
                  label: "Storage limit",
                  value: formatBytes(effectiveLimit),
                  hint: org.limitBytes === null ? "Platform default" : "Override in place",
                },
                { label: "Owner email", value: <CopyId value={org.ownerEmail} label="Owner email" /> },
                { label: "Org ID", value: <CopyId value={org.orgId} label="Org ID" /> },
              ]}
            />
          </div>
        </Section>
      </div>

      <div className="mb-6">
        <h2 className="mb-1 text-[13px] font-semibold text-ink">Files</h2>
        <p className="mb-3 text-[13px] leading-relaxed text-secondary">
          Click a file to see it and its exact storage key. Deleting a file happens on the kyte
          that owns it — open the kyte to remove an asset.
        </p>
        <DataTable
          rows={data.rows}
          columns={columns}
          rowKey={(row) => row.assetId}
          status={status}
          onRetry={reload}
          onRowClick={(row) => setViewing(row)}
          caption={`Files uploaded by ${org.orgName}, with size and uploader`}
          unit="files"
          sort={{ key: sort, dir }}
          onSortChange={(key, nextDir) => setSort(key as FileSort, nextDir)}
          empty={
            filtered
              ? {
                  title: "No files match these filters",
                  description: "Clear the kyte or file-type filter to see everything.",
                  action: (
                    <Button
                      tone="secondary"
                      size="sm"
                      onClick={() => {
                        setFilter("kyte", "");
                        setFilter("kind", "");
                      }}
                    >
                      Clear filters
                    </Button>
                  ),
                }
              : {
                  title: "No files uploaded yet",
                  description: "This org hasn’t uploaded anything, so it isn’t using any storage.",
                }
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="File type">
                <KindChip
                  active={kind === ""}
                  label="All types"
                  onSelect={() => setFilter("kind", "")}
                />
                {FILE_KINDS.map((option) => (
                  <KindChip
                    key={option}
                    active={kind === option}
                    label={FILE_KIND_LABELS[option]}
                    onSelect={() => setFilter("kind", option)}
                  />
                ))}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-tertiary">
                <span className="sr-only">Filter by kyte</span>
                <select
                  value={kyteId}
                  onChange={(event) => setFilter("kyte", event.target.value)}
                  className="max-w-[220px] cursor-pointer rounded-input border border-border bg-card px-2.5 py-2 text-[13px] text-ink"
                >
                  <option value="">All kytes</option>
                  {(kytes?.rows ?? []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.username ? `@${row.username}` : "Unpublished kyte"} ·{" "}
                      {formatNumber(row.assetCount)} files
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px] text-tertiary">
                <span className="sr-only">Sort files</span>
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
            total: data.total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>

      <AssetViewer
        asset={
          viewing
            ? {
                id: viewing.assetId,
                kind: viewing.kind,
                key: viewing.key,
                url: viewing.url,
                contentType: viewing.contentType,
                sizeBytes: viewing.sizeBytes,
                width: viewing.width,
                height: viewing.height,
                createdAt: viewing.createdAt,
                uploaderEmail: viewing.uploaderEmail,
              }
            : null
        }
        onClose={() => setViewing(null)}
        context={
          viewing
            ? [
                {
                  label: "Kyte",
                  value: (
                    <Link
                      href={`/orgs/${orgId}/${viewing.kyteId}`}
                      className="text-accent hover:text-accent-hover"
                    >
                      {viewing.kyteUsername ? `@${viewing.kyteUsername}` : "Unpublished kyte"}
                    </Link>
                  ),
                },
              ]
            : []
        }
      />

      <RaiseLimitModal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        orgId={org.orgId}
        orgName={org.orgName}
        usedBytes={org.totalBytes}
        limitBytes={org.limitBytes}
        onSaved={reload}
      />

      <EmailOwnerModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        ownerEmail={org.ownerEmail}
        orgName={org.orgName}
        totalBytes={org.totalBytes}
        limitBytes={org.limitBytes}
        assetCount={org.assetCount}
        largestFiles={largestForEmail.map((row) => ({
          label: `${FILE_KIND_LABELS[row.kind]} (${row.contentType}${row.width !== null && row.height !== null ? `, ${fileDimensions(row.width, row.height)}` : ""})`,
          sizeBytes: row.sizeBytes,
        }))}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="storageFiles"
        filters={{ orgId, kyteId: kyteId || undefined, kind: kind || undefined, sort, dir }}
        title="Export files"
        scopeDescription={`${formatNumber(data.total)} files in ${org.orgName}`}
      />
    </>
  );
}

function KindChip({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`cursor-pointer rounded-pill border px-3 py-1.5 text-[13px] ${
        active
          ? "border-accent-border bg-accent-soft text-accent"
          : "border-border bg-card text-secondary hover:bg-tint"
      }`}
    >
      {label}
    </button>
  );
}
