import { useCallback } from "react";
import { AnalyticsOffCard } from "../../ui/analytics-off-card";
import { ChartCard } from "../../ui/chart-card";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatGroup, type StatItem } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import {
  formatCompactNumber,
  formatDate,
  formatNumber,
  formatPercentPoints,
} from "../../../lib/format";
import type {
  GrowthFunnelKey,
  GrowthFunnelStep,
  GrowthStats,
} from "../../../lib/admin-source";
import { formatBucketAxis, formatBucketFull } from "../traffic/format-bucket";
import { SeriesChart } from "../traffic/series-chart";
import { BarList } from "./bar-list";
import { GROWTH_DAY_OPTIONS, useGrowthDays, type GrowthDays } from "./use-growth-days";

const DESCRIPTION =
  "The funnel from a landing page view to a kyte people actually click, and where it leaks.";

const STEP_LABEL: Record<GrowthFunnelKey, string> = {
  landing_views: "Landing views",
  get_started_clicks: "Get started",
  signups: "Signups",
  onboarded: "Onboarded",
  launched: "Launched",
};

const CHIP = "rounded-pill cursor-pointer border px-3 py-1 text-[12px] font-medium";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-border bg-card text-secondary hover:bg-tint hover:text-ink";

function stepMeta(step: GrowthFunnelStep): string {
  if (step.count === null) return "needs analytics";
  if (step.ofKey === null) return "everyone who arrived";
  if (step.ratePct === null) return `no ${STEP_LABEL[step.ofKey].toLowerCase()} to divide by`;
  return `${formatPercentPoints(step.ratePct)} of ${STEP_LABEL[step.ofKey].toLowerCase()}`;
}

function funnelItems(funnel: GrowthFunnelStep[]): StatItem[] {
  return funnel.map((step) => ({
    key: step.key,
    label: STEP_LABEL[step.key],
    value:
      step.count === null ? (
        <span className="text-ghost">—</span>
      ) : (
        formatNumber(step.count)
      ),
    sub: stepMeta(step),
    tone: step.key === "signups" ? ("accent" as const) : undefined,
  }));
}

function pathLabel(path: string): string {
  return path === "/" ? "/ (home)" : path;
}

function surfaceLabel(surface: string): string {
  return surface === "" ? "Not recorded" : surface;
}

function RangeChips({
  days,
  onChange,
}: {
  days: GrowthDays;
  onChange: (next: GrowthDays) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Range">
      {GROWTH_DAY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={days === option}
          onClick={() => onChange(option)}
          className={`${CHIP} ${days === option ? CHIP_ON : CHIP_OFF}`}
        >
          {option}d
        </button>
      ))}
    </div>
  );
}

function LandingPagesCard({ stats }: { stats: GrowthStats }) {
  const rows = stats.landingPages;
  const total = rows.reduce((acc, row) => acc + row.views, 0);

  return (
    <ChartCard
      title="Landing pages"
      hint={rows.length > 0 ? `${formatCompactNumber(total)} views in the top ${rows.length}` : undefined}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No page-level views yet"
          description={
            stats.landingPathsSince
              ? `Paths have been recorded since ${formatDate(stats.landingPathsSince)} — nothing landed in this window.`
              : "The landing site only started reporting which page was viewed in this release. Views will appear here once it ships."
          }
        />
      ) : (
        <BarList
          valueNoun="views"
          rows={rows.map((row) => ({
            key: row.path,
            label: pathLabel(row.path),
            title: row.path,
            value: row.views,
            sharePct: row.sharePct,
          }))}
        />
      )}
    </ChartCard>
  );
}

function SurfacesCard({ stats }: { stats: GrowthStats }) {
  const rows = stats.getStartedSurfaces;
  const total = rows.reduce((acc, row) => acc + row.clicks, 0);

  return (
    <ChartCard
      title="Get started clicks by surface"
      hint={rows.length > 0 ? `${formatCompactNumber(total)} clicks` : undefined}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No get-started clicks in this window"
          description="Every CTA on the landing site reports which one was pressed; widen the range if the site is quiet."
        />
      ) : (
        <BarList
          valueNoun="clicks"
          rows={rows.map((row) => ({
            key: row.surface || "unattributed",
            label: surfaceLabel(row.surface),
            value: row.clicks,
            sharePct: row.sharePct,
          }))}
        />
      )}
    </ChartCard>
  );
}

function activationItems(stats: GrowthStats): StatItem[] {
  const { activation } = stats;
  const dash = <span className="text-ghost">—</span>;
  return [
    {
      key: "launched",
      label: "Launched",
      value: formatPercentPoints(activation.launchedPct),
      sub: `${formatNumber(activation.launched)} of ${formatNumber(activation.cohortKytes)} kytes made`,
    },
    {
      key: "ten-clicks",
      label: "Reached 10 clicks",
      value:
        activation.withTenClicksPct === null
          ? dash
          : formatPercentPoints(activation.withTenClicksPct),
      sub:
        activation.withTenClicks === null
          ? "needs analytics"
          : `${formatNumber(activation.withTenClicks)} of ${formatNumber(activation.measuredKytes)} measured`,
    },
    {
      key: "ten-views",
      label: "Reached 10 views",
      value:
        activation.withTenViewsPct === null
          ? dash
          : formatPercentPoints(activation.withTenViewsPct),
      sub:
        activation.withTenViews === null
          ? "needs analytics"
          : `${formatNumber(activation.withTenViews)} of ${formatNumber(activation.measuredKytes)} measured`,
    },
    {
      key: "median-clicks",
      label: "Median clicks",
      value: activation.medianClicks === null ? dash : formatNumber(activation.medianClicks),
      sub:
        activation.medianClicks === null
          ? "needs analytics"
          : "the middle kyte of the cohort",
    },
  ];
}

export function GrowthScreen() {
  const source = useAdminSource();
  const { days, setDays } = useGrowthDays();
  const fetchGrowth = useCallback(() => source.growth({ days }), [source, days]);
  const growth = useAsync(fetchGrowth);

  const header = (
    <>
      <PageHeader title="Growth" description={DESCRIPTION} />
      <div className="mb-4">
        <RangeChips days={days} onChange={setDays} />
      </div>
    </>
  );

  if (growth.status === "loading" && !growth.data) {
    return (
      <>
        {header}
        <LoadingState rows={6} />
      </>
    );
  }

  if (growth.status === "error" || !growth.data) {
    return (
      <>
        {header}
        <ErrorState message="Couldn't load growth metrics." onRetry={growth.reload} />
      </>
    );
  }

  const stats = growth.data;
  const signups = stats.series.map((point) => point.signups);
  const launched = stats.series.map((point) => point.launched);
  const signupTotal = signups.reduce((acc, value) => acc + value, 0);
  const launchTotal = launched.reduce((acc, value) => acc + value, 0);

  return (
    <>
      {header}

      <div className="mb-4">
        <StatGroup columns={5} items={funnelItems(stats.funnel)} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {stats.analytics ? (
          <LandingPagesCard stats={stats} />
        ) : (
          <AnalyticsOffCard view="Landing pages" />
        )}
        {stats.analytics ? (
          <SurfacesCard stats={stats} />
        ) : (
          <AnalyticsOffCard view="Get started clicks by surface" />
        )}
      </div>

      <div className="mb-4">
        <StatGroup columns={4} items={activationItems(stats)} />
      </div>

      <ChartCard
        title="Signups and launches per day"
        hint={`${formatCompactNumber(signupTotal)} signups · ${formatCompactNumber(launchTotal)} launched`}
      >
        {signupTotal === 0 && launchTotal === 0 ? (
          <EmptyState title={`Nobody signed up in the last ${days} days`} />
        ) : (
          <>
            {/* Dated by when the kyte was made, not when it was published —
                every kyte counted here launched from that day's signups. */}
            <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
              {formatNumber(launchTotal)} of {formatNumber(signupTotal)} signups ended up
              with a live kyte
            </p>
            <SeriesChart
              series={[
                {
                  key: "signups",
                  label: "Signups",
                  emphasis: "primary",
                  values: signups,
                  summary: `${formatNumber(signupTotal)} total`,
                },
                {
                  key: "launched",
                  label: "Launched",
                  emphasis: "secondary",
                  values: launched,
                  summary: `${formatNumber(launchTotal)} total`,
                },
              ]}
              axisLabels={stats.series.map((point) => formatBucketAxis(point.date, "day"))}
              pointLabels={stats.series.map((point) => formatBucketFull(point.date, "day"))}
              formatValue={formatCompactNumber}
              ariaLabel={`Signups (solid line) and kytes launched (dashed line) per day for the last ${days} days: ${formatNumber(signupTotal)} signups and ${formatNumber(launchTotal)} launches.`}
              height={160}
            />
          </>
        )}
      </ChartCard>
    </>
  );
}
