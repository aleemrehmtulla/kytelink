import { useCallback, useState } from "react";
import { CountrySplit, DeviceSplit, ReferrersList } from "@kytelink/ui";
import { AnalyticsOffCard } from "../../ui/analytics-off-card";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { ChartCard } from "../../ui/chart-card";
import { DateRangePicker } from "../../ui/date-range-picker";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { ExportDialog } from "../../ui/export-dialog";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatGroup } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { useCapabilities } from "../../../hooks/use-capabilities";
import {
  formatCompactNumber,
  formatDateTime,
  formatNumber,
  formatPercentPoints,
} from "../../../lib/format";
import { buildHourBuckets, HourOfDayChart } from "./hour-of-day-chart";
import { SeriesChart } from "./series-chart";
import { TopKytesCard } from "./top-kytes-card";
import {
  formatBucketAxis,
  formatBucketFull,
  formatHourOfDay,
  GRANULARITY_BUCKET,
  GRANULARITY_NOUN,
} from "./format-bucket";
import { useTrafficRange } from "./use-traffic-range";

const DESCRIPTION =
  "Views, clicks and visitors over any window, with the kytes, referrers, countries and devices behind them.";

function deltaFor(
  current: number | undefined,
  previous: number | undefined,
  label: string,
): { pct: number; label: string } | undefined {
  if (current === undefined || previous === undefined || previous <= 0) return undefined;
  return { pct: Math.round(((current - previous) / previous) * 1000) / 10, label };
}

function ratioPct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function TrafficScreen() {
  const capabilities = useCapabilities();

  if (!capabilities.analytics) {
    return (
      <>
        <PageHeader title="Traffic" description={DESCRIPTION} />
        <AnalyticsOffCard view="Traffic" />
      </>
    );
  }

  return <TrafficDashboard />;
}

function TrafficDashboard() {
  const source = useAdminSource();
  const {
    from,
    to,
    granularity,
    query,
    setRange,
    setGranularity,
    durationLabel,
    previousLabel,
  } = useTrafficRange();
  const [seriesExportOpen, setSeriesExportOpen] = useState(false);

  const fetchSeries = useCallback(() => source.trafficSeries(query), [source, query]);
  const fetchTop = useCallback(
    () => source.topKytes({ ...query, limit: 15 }),
    [source, query],
  );
  const fetchBreakdown = useCallback(
    () => source.trafficBreakdown(query),
    [source, query],
  );
  const series = useAsync(fetchSeries);
  const top = useAsync(fetchTop);
  const breakdown = useAsync(fetchBreakdown);

  const rangeLabel = `${formatDateTime(query.from)} – ${formatDateTime(query.to)}`;
  const data = series.data;
  const effective = data?.granularity ?? query.granularity;
  const bucket = GRANULARITY_BUCKET[effective];
  const points = data?.points ?? [];
  const totals = data?.totals;
  const previous = data?.previousTotals;
  const hasTraffic = totals ? totals.views > 0 || totals.clicks > 0 : false;
  const coarsened = data !== undefined && data.granularity !== query.granularity;

  const axisLabels = points.map((point) => formatBucketAxis(point.bucket, effective));
  const pointLabels = points.map((point) => formatBucketFull(point.bucket, effective));
  const viewsPeak = points.reduce((acc, point) => Math.max(acc, point.views), 0);

  const referrers = breakdown.data?.referrers ?? [];
  const countries = breakdown.data?.countries ?? [];
  const devices = breakdown.data?.devices ?? [];
  const hourBuckets = buildHourBuckets(breakdown.data?.hourOfDay ?? []);
  const referrerViews = referrers.reduce((acc, row) => acc + row.views, 0);
  const deviceViews = devices.reduce((acc, row) => acc + row.views, 0);
  const hourViews = hourBuckets.reduce((acc, value) => acc + value, 0);
  const hourPeak = hourBuckets.reduce((acc, value) => Math.max(acc, value), 0);
  const topDevice = devices.reduce<(typeof devices)[number] | undefined>(
    (acc, row) => (!acc || row.views > acc.views ? row : acc),
    undefined,
  );

  return (
    <>
      <PageHeader title="Traffic" description={DESCRIPTION} />

      <div className="mb-4">
        <DateRangePicker
          value={{ from, to }}
          onChange={setRange}
          granularity={granularity}
          onGranularityChange={setGranularity}
          maxDays={366}
        />
      </div>

      <div className="mb-4">
        <StatGroup
          columns={6}
          items={[
            {
              key: "views",
              label: "Views",
              value: totals ? formatNumber(totals.views) : "—",
              delta: deltaFor(totals?.views, previous?.views, previousLabel),
              sub:
                previous && previous.views > 0
                  ? undefined
                  : `No views in the previous ${durationLabel}`,
            },
            {
              key: "clicks",
              label: "Clicks",
              value: totals ? formatNumber(totals.clicks) : "—",
              delta: deltaFor(totals?.clicks, previous?.clicks, previousLabel),
              sub:
                previous && previous.clicks > 0
                  ? undefined
                  : `No clicks in the previous ${durationLabel}`,
            },
            {
              key: "visitors",
              label: "Visitors",
              value: totals ? formatNumber(totals.visitors) : "—",
              delta: deltaFor(totals?.visitors, previous?.visitors, previousLabel),
              sub:
                previous && previous.visitors > 0
                  ? undefined
                  : `No visitors in the previous ${durationLabel}`,
            },
            {
              key: "ctr",
              label: "CTR",
              value: totals ? formatPercentPoints(totals.ctrPct) : "—",
              sub:
                previous && previous.views > 0
                  ? `was ${formatPercentPoints(ratioPct(previous.clicks, previous.views))} in the previous ${durationLabel}`
                  : "clicks per view in this window",
            },
            {
              key: "views-per-visitor",
              label: "Views / visitor",
              value:
                totals && totals.visitors > 0
                  ? (Math.round((totals.views / totals.visitors) * 10) / 10).toFixed(1)
                  : "—",
              sub: "repeat views per distinct visitor",
            },
            {
              key: "bots",
              label: "Bot share",
              value: totals ? formatPercentPoints(totals.botPct) : "—",
              sub: "of raw views, excluded from the totals",
            },
          ]}
        />
      </div>

      <div className="mb-4">
        <Card
          title="Views and clicks over time"
          action={
            <Button
              tone="secondary"
              size="sm"
              onClick={() => setSeriesExportOpen(true)}
              disabled={points.length === 0}
            >
              Export
            </Button>
          }
        >
          {series.status === "loading" && !data ? (
            <LoadingState rows={3} />
          ) : series.status === "error" || !data ? (
            <ErrorState message="Couldn't load the series." onRetry={series.reload} />
          ) : !hasTraffic ? (
            <EmptyState
              title="No traffic in this window"
              description={`Nothing was recorded in ${rangeLabel}. Analytics is on and reachable — this window is simply empty.`}
            />
          ) : (
            <>
              {/* The coarsening notice lives inside the card it explains: as a
                  banner above the fold it appeared and vanished with the
                  granularity and shoved the whole page down a line. */}
              <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
                {formatNumber(points.length)} {bucket} buckets, cut on UTC boundaries ·
                peak {formatNumber(viewsPeak)} views in one {bucket}
                {coarsened ? (
                  <span className="text-warning">
                    {" · "}
                    {GRANULARITY_NOUN[query.granularity]} buckets are too fine for a
                    window this wide, so the server coarsened them
                  </span>
                ) : null}
              </p>
              <SeriesChart
                series={[
                  {
                    key: "views",
                    label: "Views",
                    emphasis: "primary",
                    values: points.map((point) => point.views),
                    summary: formatCompactNumber(totals ? totals.views : 0),
                  },
                  {
                    key: "clicks",
                    label: "Clicks",
                    emphasis: "secondary",
                    values: points.map((point) => point.clicks),
                    summary: formatCompactNumber(totals ? totals.clicks : 0),
                  },
                ]}
                axisLabels={axisLabels}
                pointLabels={pointLabels}
                formatValue={formatCompactNumber}
                ariaLabel={`Views (solid line) and clicks (dashed line) per ${bucket} from ${rangeLabel}. Views total ${formatNumber(totals ? totals.views : 0)}, peaking at ${formatNumber(viewsPeak)} in one ${bucket}; clicks total ${formatNumber(totals ? totals.clicks : 0)}.`}
                height={200}
              />
            </>
          )}
          <ExportDialog
            open={seriesExportOpen}
            onClose={() => setSeriesExportOpen(false)}
            dataset="trafficSeries"
            filters={{ ...query }}
            title="Export traffic series"
            scopeDescription={`${formatNumber(points.length)} ${bucket} buckets, ${rangeLabel}`}
          />
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Views by hour of day"
          hint={
            hourViews > 0
              ? `busiest ${formatHourOfDay(hourBuckets.indexOf(hourPeak))} UTC · ${formatCompactNumber(hourPeak)} views`
              : undefined
          }
        >
          {breakdown.status === "loading" && !breakdown.data ? (
            <LoadingState rows={3} />
          ) : !breakdown.data ? (
            <ErrorState
              message="Couldn't load the hourly breakdown."
              onRetry={breakdown.reload}
            />
          ) : hourViews === 0 ? (
            <EmptyState title="No views in this window" />
          ) : (
            <HourOfDayChart data={breakdown.data.hourOfDay} />
          )}
        </ChartCard>

        <ChartCard
          title={`CTR by ${bucket}`}
          hint={
            totals ? `${formatPercentPoints(totals.ctrPct)} across the window` : undefined
          }
        >
          {series.status === "loading" && !data ? (
            <LoadingState rows={3} />
          ) : series.status === "error" || !data ? (
            <ErrorState message="Couldn't load the series." onRetry={series.reload} />
          ) : !hasTraffic ? (
            <EmptyState title="No traffic in this window" />
          ) : (
            <SeriesChart
              series={[
                {
                  key: "ctr",
                  label: "Clicks per view",
                  emphasis: "primary",
                  values: points.map((point) => ratioPct(point.clicks, point.views)),
                  summary: `avg ${formatPercentPoints(totals ? totals.ctrPct : 0)}`,
                },
              ]}
              axisLabels={axisLabels}
              pointLabels={pointLabels}
              formatValue={formatPercentPoints}
              ariaLabel={`Click-through rate per ${bucket} from ${rangeLabel}, averaging ${formatPercentPoints(totals ? totals.ctrPct : 0)} across the window.`}
              height={140}
            />
          )}
        </ChartCard>
      </div>

      <div className="mb-4">
        <TopKytesCard
          rows={top.data?.kytes}
          status={top.status}
          onRetry={top.reload}
          filters={{ ...query, limit: 15 }}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Referrers"
          hint={
            referrers.length > 0
              ? `${formatCompactNumber(referrerViews)} views from ${formatNumber(referrers.length)} sources`
              : undefined
          }
        >
          {breakdown.status === "loading" && !breakdown.data ? (
            <LoadingState rows={5} />
          ) : !breakdown.data ? (
            <ErrorState message="Couldn't load referrers." onRetry={breakdown.reload} />
          ) : (
            <ReferrersList data={referrers} emptyLabel="No referrers in this window" />
          )}
        </ChartCard>

        <ChartCard
          title="Countries"
          hint={
            countries.length > 0
              ? `${formatNumber(countries.length)} countries · top ${countries[0]?.country || "Unknown"}`
              : undefined
          }
        >
          {breakdown.status === "loading" && !breakdown.data ? (
            <LoadingState rows={5} />
          ) : !breakdown.data ? (
            <ErrorState message="Couldn't load countries." onRetry={breakdown.reload} />
          ) : (
            <CountrySplit data={countries} emptyLabel="No country data in this window" />
          )}
        </ChartCard>

        <ChartCard
          title="Devices"
          hint={
            topDevice && deviceViews > 0
              ? `${formatCompactNumber(deviceViews)} views · ${Math.round(ratioPct(topDevice.views, deviceViews))}% on the top device`
              : undefined
          }
        >
          {breakdown.status === "loading" && !breakdown.data ? (
            <LoadingState rows={2} />
          ) : !breakdown.data ? (
            <ErrorState message="Couldn't load devices." onRetry={breakdown.reload} />
          ) : (
            <DeviceSplit data={devices} emptyLabel="No device data in this window" />
          )}
        </ChartCard>
      </div>
    </>
  );
}
