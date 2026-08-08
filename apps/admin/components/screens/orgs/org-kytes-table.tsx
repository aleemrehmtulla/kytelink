import { useCallback, useMemo, useState } from "react";
import type { ModerationStatus } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { CopyId } from "../../ui/copy-id";
import { DataTable, type Column } from "../../ui/data-table";
import { ExportDialog } from "../../ui/export-dialog";
import { ModerationStatusPill } from "../../ui/status-pill";
import { Section } from "../../ui/section";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import { usePagedQuery } from "../../../hooks/use-paged-query";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
} from "../../../lib/format";
import type { OrgKyteRow, OrgKytesInput } from "../../../lib/admin-source";
import { MODERATION_FILTERS, sortHandler } from "./labels";
import { FilterChips, TableSearch, Toolbar } from "./table-toolbar";

type KytesQuery = Required<
  Pick<OrgKytesInput, "orgId" | "query" | "sort" | "dir" | "page" | "pageSize">
> & { moderationStatus?: ModerationStatus };
type KyteSort = KytesQuery["sort"];

const KYTE_SORT_KEYS: readonly KyteSort[] = ["createdAt", "username", "storageBytes"];

export interface OrgKytesTableProps {
  orgId: string;
}

export function OrgKytesTable({ orgId }: OrgKytesTableProps) {
  const source = useAdminSource();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<KyteSort>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [rawQuery, setRawQuery] = useState("");
  const [moderation, setModeration] = useState<ModerationStatus | "all">("all");
  const [exportOpen, setExportOpen] = useState(false);
  const query = useDebouncedValue(rawQuery, 250);
  const filtered = rawQuery !== "" || moderation !== "all";

  const run = useCallback((next: KytesQuery) => source.orgKytes(next), [source]);
  const input = useMemo<KytesQuery>(
    () => ({
      orgId,
      query,
      sort,
      dir,
      page,
      pageSize,
      ...(moderation === "all" ? {} : { moderationStatus: moderation }),
    }),
    [orgId, query, moderation, sort, dir, page, pageSize],
  );
  const { data, status, reload } = usePagedQuery(run, input);
  const total = data?.total ?? 0;

  const columns = useMemo<Column<OrgKyteRow>[]>(
    () => [
      {
        key: "kyte",
        header: "Kyte",
        sortKey: "username",
        width: "32%",
        mobile: "title",
        cell: (kyte) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            {kyte.username ? (
              <span className="truncate font-medium text-ink">@{kyte.username}</span>
            ) : (
              <CopyId value={kyte.id} label="Kyte ID" />
            )}
            {kyte.displayName ? (
              <span className="truncate text-[12px] text-tertiary">{kyte.displayName}</span>
            ) : (
              <span className="text-[12px] text-faint">No display name</span>
            )}
          </span>
        ),
      },
      {
        key: "state",
        header: "State",
        mobile: "meta",
        cell: (kyte) =>
          kyte.published ? (
            <span className="text-ink">Published</span>
          ) : (
            <span className="text-tertiary">Draft</span>
          ),
      },
      {
        key: "moderation",
        header: "Moderation",
        mobile: "detail",
        cell: (kyte) => <ModerationStatusPill status={kyte.moderationStatus} />,
      },
      {
        key: "storage",
        header: "Storage",
        align: "right",
        sortKey: "storageBytes",
        mobile: "detail",
        cell: (kyte) => (
          <span
            className="text-ink"
            title={`${formatNumber(kyte.assetCount)} file${kyte.assetCount === 1 ? "" : "s"}`}
          >
            {formatBytes(kyte.storageBytes)}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        align: "right",
        sortKey: "createdAt",
        mobile: "detail",
        cell: (kyte) => (
          <span className="text-tertiary" title={formatDateTimeFull(kyte.createdAt)}>
            {formatRelativeTime(kyte.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Section
      title="Kytes"
      description="Every page this org owns. Filter by moderation state to see what is off the internet right now."
      action={
        <Button tone="secondary" size="sm" onClick={() => setExportOpen(true)}>
          Export
        </Button>
      }
    >
      <DataTable<OrgKyteRow>
        caption="Org kytes"
        unit="kytes"
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={(kyte) => kyte.id}
        status={status}
        onRetry={reload}
        href={(kyte) => `/orgs/${orgId}/${kyte.id}`}
        sort={{ key: sort, dir }}
        onSortChange={sortHandler(KYTE_SORT_KEYS, (key, nextDir) => {
          setSort(key);
          setDir(nextDir);
          setPage(1);
        })}
        empty={{
          title: filtered ? "No kytes match those filters." : "No kytes yet.",
          description: filtered
            ? "Clear the moderation filter, or search by username."
            : "This org hasn't created a page yet.",
        }}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
        toolbar={
          <Toolbar>
            <TableSearch
              id={`kytes-search-${orgId}`}
              value={rawQuery}
              onChange={(next) => {
                setRawQuery(next);
                setPage(1);
              }}
              placeholder="Search kytes by username or display name"
              label="Search kytes"
            />
            <FilterChips
              label="Filter by moderation status"
              options={MODERATION_FILTERS}
              value={moderation}
              onChange={(next) => {
                setModeration(next);
                setPage(1);
              }}
            />
          </Toolbar>
        }
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dataset="orgKytes"
        filters={{
          orgId,
          query,
          sort,
          dir,
          ...(moderation === "all" ? {} : { moderationStatus: moderation }),
        }}
        title="Export kytes"
        scopeDescription={`${formatNumber(total)} kytes matching your filters`}
      />
    </Section>
  );
}
