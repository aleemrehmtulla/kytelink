import { useCallback } from "react";
import { PageHeader } from "../../ui/page-header";
import { StatGroup } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatBytes, formatNumber } from "../../../lib/format";
import { OrphansTable } from "./orphans-table";

export function StorageOrphansScreen() {
  const source = useAdminSource();
  const fetchOverview = useCallback(() => source.storageOverview(), [source]);
  const { data: overview } = useAsync(fetchOverview);

  const count = overview?.orphanedCount ?? null;
  const bytes = overview?.orphanedBytes ?? null;

  return (
    <>
      <PageHeader
        title="Orphaned files"
        breadcrumbs={[{ label: "Storage", href: "/storage" }, { label: "Orphaned files" }]}
        description="Uploads no published content references any more — usually left behind when an image was replaced. They still count against the org's limit."
      />

      <div className="mb-4">
        <StatGroup
          columns={2}
          items={[
            {
              key: "count",
              label: "Orphaned files",
              value:
                count === null ? <span className="text-ghost">—</span> : formatNumber(count),
              sub: "unreferenced by any kyte",
              tone: count !== null && count > 0 ? "warning" : "default",
            },
            {
              key: "bytes",
              label: "Reclaimable",
              value: bytes === null ? <span className="text-ghost">—</span> : formatBytes(bytes),
              sub: "freed if every one were deleted",
            },
          ]}
        />
      </div>

      <OrphansTable />
    </>
  );
}
