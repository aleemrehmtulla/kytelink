import Link from "next/link";
import { useCallback } from "react";
import { TimeSeriesChart } from "@kytelink/ui";
import { ErrorState } from "../../ui/error-state";
import { PageHeader } from "../../ui/page-header";
import { Section } from "../../ui/section";
import { StatGroup } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatBytes, formatNumber, formatPercentPoints } from "../../../lib/format";

const HEADLINE_LABELS = ["Total stored", "Files", "Orgs with storage", "Orphaned"] as const;
const SHAPE_LABELS = ["Top 10 orgs’ share", "Median org", "p95 org", "Mean per org"] as const;

export function StorageOverviewScreen() {
  const source = useAdminSource();
  const fetchOverview = useCallback(() => source.storageOverview(), [source]);
  const { data: overview, status, reload } = useAsync(fetchOverview);

  const growthSeries = overview?.growthSeries ?? [];
  const growthPoints = growthSeries.map((point) => ({ date: point.date, views: point.bytes }));
  const growthFirst = growthSeries[0]?.bytes ?? 0;
  const growthLast = growthSeries[growthSeries.length - 1]?.bytes ?? 0;
  const growthDelta = growthLast - growthFirst;

  const header = (
    <PageHeader
      title="Storage"
      description="How much the platform is holding, and how fast that is growing."
      action={
        <Link
          href="/storage/orgs"
          className="rounded-pill border-border bg-card text-secondary hover:bg-tint cursor-pointer border px-3.5 py-1.5 text-[13px]"
        >
          Browse by org →
        </Link>
      }
    />
  );

  // Pending totals render the finished groups with em-dashes, so the numbers
  // land without the page changing height.
  if (status === "loading" && !overview) {
    return (
      <>
        {header}
        {[HEADLINE_LABELS, SHAPE_LABELS].map((labels, index) => (
          <div key={index} className="mb-4">
            <StatGroup
              items={labels.map((label) => ({
                key: label,
                label,
                value: <span className="text-ghost">—</span>,
              }))}
            />
          </div>
        ))}
      </>
    );
  }

  if (status === "error" || !overview) {
    return (
      <>
        {header}
        <ErrorState message="Couldn’t load the storage totals." onRetry={reload} />
      </>
    );
  }

  return (
    <>
      {header}

      <div className="mb-4">
        <StatGroup
          items={[
            {
              key: "total",
              label: HEADLINE_LABELS[0],
              value: formatBytes(overview.bucketTotalBytes),
              sub: `${growthDelta > 0 ? "+" : ""}${formatBytes(Math.abs(growthDelta))} in 30 days`,
            },
            {
              key: "files",
              label: HEADLINE_LABELS[1],
              value: formatNumber(overview.assetCount),
              sub: "uploaded across the platform",
            },
            {
              key: "orgs",
              label: HEADLINE_LABELS[2],
              value: formatNumber(overview.orgsWithStorage),
              sub: "holding at least one file",
              href: "/storage/orgs",
            },
            {
              key: "orphaned",
              label: HEADLINE_LABELS[3],
              value: formatBytes(overview.orphanedBytes),
              sub: `${formatNumber(overview.orphanedCount)} unreferenced ${overview.orphanedCount === 1 ? "file" : "files"}`,
              tone: overview.orphanedCount > 0 ? "warning" : "default",
              href: "/storage/orphans",
            },
          ]}
        />
      </div>

      <div className="mb-6">
        <StatGroup
          items={[
            {
              key: "top-ten",
              label: SHAPE_LABELS[0],
              value: formatPercentPoints(overview.topTenSharePct),
              sub: "of everything stored",
            },
            {
              key: "median",
              label: SHAPE_LABELS[1],
              value: formatBytes(overview.medianOrgBytes),
              sub: "the typical org",
            },
            {
              key: "p95",
              label: SHAPE_LABELS[2],
              value: formatBytes(overview.p95OrgBytes),
              sub: "heaviest 5% start here",
            },
            {
              key: "mean",
              label: SHAPE_LABELS[3],
              value: formatBytes(
                overview.orgsWithStorage > 0
                  ? Math.round(overview.bucketTotalBytes / overview.orgsWithStorage)
                  : 0,
              ),
              sub: "vs the median beside it",
              href: "/storage/orgs",
            },
          ]}
        />
      </div>

      <Section title="Storage growth" description="Cumulative bytes stored, last 30 days.">
        <div className="grid gap-4 md:grid-cols-[1fr_190px]">
          <TimeSeriesChart
            data={growthPoints}
            ariaLabel={`Cumulative bytes stored over the last ${growthPoints.length} days, from ${formatBytes(growthFirst)} to ${formatBytes(growthLast)}`}
          />
          <dl className="md:border-hairline flex flex-col gap-3 md:border-l md:pl-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-tertiary text-[12px]">Stored now</dt>
              <dd className="text-ink text-[20px] font-bold tracking-[-0.02em]">
                {formatBytes(overview.bucketTotalBytes)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-tertiary text-[12px]">Added in 30 days</dt>
              <dd
                className={`text-[20px] font-bold tracking-[-0.02em] ${growthDelta > 0 ? "text-success" : "text-ink"}`}
              >
                {growthDelta > 0 ? "+" : ""}
                {formatBytes(Math.abs(growthDelta))}
              </dd>
            </div>
          </dl>
        </div>
      </Section>
    </>
  );
}
