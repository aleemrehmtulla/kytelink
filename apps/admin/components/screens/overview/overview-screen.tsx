import { useCallback } from "react";
import { AnalyticsOffCard } from "../../ui/analytics-off-card";
import { ChartCard } from "../../ui/chart-card";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { SectionLabel } from "../../ui/section-label";
import { StatGroup } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { useCapabilities } from "../../../hooks/use-capabilities";
import {
  formatCompactNumber,
  formatNumber,
  formatPercentPoints,
} from "../../../lib/format";
import type { PlatformSeriesOutput } from "../../../lib/admin-source";
import { formatBucketAxis, formatBucketFull } from "../traffic/format-bucket";
import { SeriesChart } from "../traffic/series-chart";
import { PlatformHealthSection } from "./platform-health-section";

const DESCRIPTION =
  "Who's on the platform, what they're publishing, and what needs an admin.";
const TREND_WINDOW = 7;

const STAT_GROUP_LABELS: { section?: string; labels: string[] }[] = [
  { labels: ["Total users", "Total kytes", "Published kytes", "Total orgs"] },
  {
    section: "Needs attention",
    labels: [
      "Open reports",
      "Suspended kytes",
      "Suspended users",
      "Unresolved alerts",
    ],
  },
];

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function trendLine(values: number[], noun: string): string {
  const recent = sum(values.slice(-TREND_WINDOW));
  const prior = sum(values.slice(-TREND_WINDOW * 2, -TREND_WINDOW));
  const base = `${formatNumber(recent)} ${noun} in the last ${TREND_WINDOW} days`;
  if (prior <= 0) return `${base} · nothing to compare against before that`;
  const changePct = Math.round(((recent - prior) / prior) * 1000) / 10;
  const arrow = changePct >= 0 ? "▲" : "▼";
  return `${base} · ${arrow} ${Math.abs(changePct)}% vs the ${TREND_WINDOW} before`;
}

export function OverviewScreen() {
  const capabilities = useCapabilities();
  const source = useAdminSource();
  const fetchOverview = useCallback(() => source.overview(), [source]);
  const fetchSeries = useCallback(
    (): Promise<PlatformSeriesOutput | null> =>
      capabilities.analytics
        ? source.platformSeries({ days: 30 })
        : Promise.resolve(null),
    [source, capabilities.analytics],
  );
  const overview = useAsync(fetchOverview);
  const series = useAsync(fetchSeries);

  // Pending totals render as the finished layout with em-dashes rather than a
  // skeleton of a different shape — the numbers fill in without moving.
  if (overview.status === "loading" && !overview.data) {
    return (
      <>
        <PageHeader title="Overview" description={DESCRIPTION} />
        <span className="sr-only" role="status">
          Loading platform totals
        </span>
        {STAT_GROUP_LABELS.map((group, index) => (
          <div key={group.section ?? "totals"} className="mb-8">
            {group.section ? <SectionLabel>{group.section}</SectionLabel> : null}
            <StatGroup
              items={group.labels.map((label) => ({
                key: `${index}-${label}`,
                label,
                value: <span className="text-ghost">—</span>,
              }))}
            />
          </div>
        ))}
      </>
    );
  }

  if (overview.status === "error" || !overview.data) {
    return (
      <>
        <PageHeader title="Overview" description={DESCRIPTION} />
        <ErrorState message="Couldn't load platform totals." onRetry={overview.reload} />
      </>
    );
  }

  const stats = overview.data;
  const attention =
    stats.openReports +
    stats.suspendedKytes +
    stats.suspendedUsers +
    stats.unresolvedAlerts;

  const signupCounts = stats.signupsSeries.map((point) => point.count);
  const signupTotal = sum(signupCounts);
  const signupPeak = signupCounts.reduce((acc, value) => Math.max(acc, value), 0);

  const platformPoints = series.data?.points ?? [];
  const platformViews = sum(platformPoints.map((point) => point.views));
  const platformClicks = sum(platformPoints.map((point) => point.clicks));

  return (
    <>
      <PageHeader title="Overview" description={DESCRIPTION} />

      <div className="mb-8">
        <StatGroup
          items={[
            {
              key: "users",
              label: "Total users",
              value: formatNumber(stats.totalUsers),
              delta: {
                pct: stats.usersWeekTrendPct,
                label: `vs previous ${TREND_WINDOW} days`,
              },
            },
            {
              key: "kytes",
              label: "Total kytes",
              value: formatNumber(stats.totalKytes),
            },
            {
              key: "published",
              label: "Published kytes",
              value: formatNumber(stats.publishedKytes),
              sub:
                stats.totalKytes > 0
                  ? `${formatPercentPoints((stats.publishedKytes / stats.totalKytes) * 100)} of all kytes`
                  : undefined,
            },
            { key: "orgs", label: "Total orgs", value: formatNumber(stats.totalOrgs) },
          ]}
        />
      </div>

      <SectionLabel
        hint={attention === 0 ? "Nothing needs an admin right now." : undefined}
      >
        Needs attention
      </SectionLabel>
      <div className="mb-8">
        <StatGroup
          items={[
            {
              key: "reports",
              label: "Open reports",
              value: formatNumber(stats.openReports),
              tone: stats.openReports > 0 ? "warning" : undefined,
              href: "/moderation/reports",
              sub: stats.openReports > 0 ? "waiting on a decision" : "queue is clear",
            },
            {
              key: "suspended-kytes",
              label: "Suspended kytes",
              value: formatNumber(stats.suspendedKytes),
              tone: stats.suspendedKytes > 0 ? "warning" : undefined,
              href: "/moderation",
              sub: stats.suspendedKytes > 0 ? "pages currently offline" : "none offline",
            },
            {
              key: "suspended-users",
              label: "Suspended users",
              value: formatNumber(stats.suspendedUsers),
              tone: stats.suspendedUsers > 0 ? "warning" : undefined,
              href: "/users?status=SUSPENDED",
              sub:
                stats.suspendedUsers > 0 ? "read-only accounts" : "no accounts suspended",
            },
            {
              key: "alerts",
              label: "Unresolved alerts",
              value: formatNumber(stats.unresolvedAlerts),
              tone: stats.unresolvedAlerts > 0 ? "danger" : undefined,
              href: "/alerts",
              sub:
                stats.unresolvedAlerts > 0
                  ? "the platform is complaining"
                  : "nothing firing",
            },
          ]}
        />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Signups / day"
          hint={`${formatCompactNumber(signupTotal)} in 30 days`}
        >
          {stats.signupsSeries.length === 0 ? (
            <EmptyState title="No signups recorded yet" />
          ) : (
            <>
              <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
                {trendLine(signupCounts, "signups")}
              </p>
              <SeriesChart
                series={[
                  {
                    key: "signups",
                    label: "Signups",
                    emphasis: "primary",
                    values: signupCounts,
                    summary: `${formatNumber(signupTotal)} total`,
                  },
                ]}
                axisLabels={stats.signupsSeries.map((point) =>
                  formatBucketAxis(point.date, "day"),
                )}
                pointLabels={stats.signupsSeries.map((point) =>
                  formatBucketFull(point.date, "day"),
                )}
                formatValue={formatCompactNumber}
                ariaLabel={`Signups per day for the last 30 days, ${formatNumber(signupTotal)} total, peaking at ${formatNumber(signupPeak)} in one day.`}
                height={160}
              />
            </>
          )}
        </ChartCard>

        {capabilities.analytics ? (
          <ChartCard
            title="Platform views / day"
            hint={`${formatCompactNumber(platformViews)} views in 30 days`}
          >
            {series.status === "loading" && !series.data ? (
              <LoadingState rows={3} />
            ) : series.status === "error" || !series.data ? (
              <ErrorState
                message="Couldn't load platform views."
                onRetry={series.reload}
              />
            ) : platformViews === 0 ? (
              <EmptyState title="No views recorded in the last 30 days" />
            ) : (
              <>
                <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
                  {trendLine(
                    platformPoints.map((point) => point.views),
                    "views",
                  )}
                </p>
                <SeriesChart
                  series={[
                    {
                      key: "views",
                      label: "Views",
                      emphasis: "primary",
                      values: platformPoints.map((point) => point.views),
                      summary: `${formatCompactNumber(platformViews)} total`,
                    },
                    {
                      key: "clicks",
                      label: "Clicks",
                      emphasis: "secondary",
                      values: platformPoints.map((point) => point.clicks),
                      summary: `${formatCompactNumber(platformClicks)} total`,
                    },
                  ]}
                  axisLabels={platformPoints.map((point) =>
                    formatBucketAxis(point.date, "day"),
                  )}
                  pointLabels={platformPoints.map((point) =>
                    formatBucketFull(point.date, "day"),
                  )}
                  formatValue={formatCompactNumber}
                  ariaLabel={`Platform views (solid line) and link clicks (dashed line) per day for the last 30 days, ${formatNumber(platformViews)} views and ${formatNumber(platformClicks)} clicks in total.`}
                  height={160}
                />
              </>
            )}
          </ChartCard>
        ) : (
          <AnalyticsOffCard view="Platform views" />
        )}
      </div>

      <PlatformHealthSection stats={stats} />
    </>
  );
}
