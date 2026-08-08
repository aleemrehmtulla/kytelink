import { useCallback, useState } from "react";
import { AnalyticsOffCard } from "../../ui/analytics-off-card";
import { ChartCard } from "../../ui/chart-card";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatGroup } from "../../ui/stat-group";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useCapabilities } from "../../../hooks/use-capabilities";
import { usePolling } from "../../../hooks/use-polling";
import { formatNumber } from "../../../lib/format";
import { parseBucketInstant } from "../traffic/format-bucket";
import { SeriesChart } from "../traffic/series-chart";
import { LiveTopKytes } from "./live-top-kytes";
import { PollStatus } from "./poll-status";

const DESCRIPTION =
  "Distinct visitors in the last 5 minutes, and the last hour minute by minute.";
const INTERVAL_MS = 5_000;
const MINUTE_SLOTS = 60;
const MINUTE_MS = 60_000;

// The contract only returns minutes that had a hit, so a raw plot of the rows
// would compress a quiet hour into a dense line. Every minute of the window gets
// a slot, anchored on the poll that produced the data, which also makes the axis
// honestly relative ("12 min ago") instead of timezone-dependent.
function densifyMinutes(
  points: { minute: string; count: number }[],
  anchorMs: number,
): number[] {
  const anchor = Math.floor(anchorMs / MINUTE_MS);
  const values = new Array<number>(MINUTE_SLOTS).fill(0);
  for (const point of points) {
    const parsed = parseBucketInstant(point.minute).getTime();
    if (Number.isNaN(parsed)) continue;
    const index = MINUTE_SLOTS - 1 - (anchor - Math.floor(parsed / MINUTE_MS));
    if (index >= 0 && index < MINUTE_SLOTS) values[index] = point.count;
  }
  return values;
}

// The newest slot is the minute in progress, so it always reads low; it is
// labelled as partial and the headline figure quotes the last complete minute.
const MINUTE_LABELS = Array.from({ length: MINUTE_SLOTS }, (_, index) => {
  const ago = MINUTE_SLOTS - 1 - index;
  if (ago === 0) return "this minute (partial)";
  return ago === 1 ? "1 min ago" : `${ago} min ago`;
});

function peakOf(values: number[]): number {
  return values.reduce((acc, value) => Math.max(acc, value), 0);
}

export function LiveScreen() {
  const capabilities = useCapabilities();

  if (!capabilities.analytics) {
    return (
      <>
        <PageHeader title="Live" description={DESCRIPTION} />
        <AnalyticsOffCard view="Live" />
      </>
    );
  }

  return <LiveDashboard />;
}

function LiveDashboard() {
  const source = useAdminSource();
  const [paused, setPaused] = useState(false);
  const fetchLive = useCallback(() => source.live(), [source]);
  const { data, status, lastUpdatedAt, failures, refresh } = usePolling(
    fetchLive,
    INTERVAL_MS,
    {
      paused,
    },
  );

  const stale = status === "error";

  if (!data || lastUpdatedAt === null) {
    return (
      <>
        <PageHeader title="Live" description={DESCRIPTION} />
        {stale ? (
          <ErrorState
            message="Couldn't reach the live endpoint. Nothing to show yet."
            onRetry={refresh}
          />
        ) : (
          <LoadingState rows={5} />
        )}
      </>
    );
  }

  const viewsPerMin = densifyMinutes(data.viewsPerMin, lastUpdatedAt);
  const clicksPerMin = densifyMinutes(data.clicksPerMin, lastUpdatedAt);
  const viewsNow = viewsPerMin[MINUTE_SLOTS - 2] ?? 0;
  const clicksNow = clicksPerMin[MINUTE_SLOTS - 2] ?? 0;
  const viewsPeak = peakOf(viewsPerMin);
  const clicksPeak = peakOf(clicksPerMin);

  return (
    <>
      <PageHeader
        title="Live"
        description={DESCRIPTION}
        action={
          <PollStatus
            lastUpdatedAt={lastUpdatedAt}
            paused={paused}
            stale={stale}
            intervalSeconds={INTERVAL_MS / 1000}
            onTogglePause={() => setPaused((prev) => !prev)}
            onRefresh={refresh}
          />
        }
      />

      {stale ? (
        <p className="rounded-card border-danger-border bg-danger-soft text-danger mb-4 border px-4 py-2.5 text-[13px]">
          These numbers are frozen — the last{" "}
          {failures === 1 ? "refresh" : `${failures} refreshes`} failed. Auto-refresh
          keeps retrying, waiting a little longer after each failure. Everything below is
          the last successful reading, not the current state.
        </p>
      ) : null}

      {/* Active now leads the group rather than sitting in a taller box beside
          it, so the four numbers share one card and one baseline. */}
      <div className="mb-4">
        <StatGroup
          items={[
            {
              key: "active",
              label: (
                <>
                  <span
                    className={`rounded-pill h-1.5 w-1.5 ${stale || paused ? "bg-faint" : "bg-success"}`}
                    aria-hidden="true"
                  />
                  Active now
                </>
              ),
              value: formatNumber(data.activeNow),
              sub: "visitors in the last 5 minutes",
              tone: "accent",
            },
            {
              key: "signups",
              label: "Signups today",
              value: formatNumber(data.signupsToday),
              sub: "new accounts",
            },
            {
              key: "publishes",
              label: "Publishes today",
              value: formatNumber(data.publishesToday),
              sub: "published or republished",
            },
            {
              key: "editors",
              label: "Active editors",
              value: formatNumber(data.activeEditors),
              sub: "owners editing right now",
            },
          ]}
        />
      </div>

      {/* One full-width chart rather than two half-width ones: views and clicks
          are read against each other, and 60 minute-buckets need the room. */}
      <div className="mb-4">
        <ChartCard title="Views and clicks / min" hint="last 60 minutes">
          <p className="text-tertiary -mt-2 mb-3 text-[12px] tabular-nums">
            last full minute {formatNumber(viewsNow)} views · {formatNumber(clicksNow)}{" "}
            clicks · peak {formatNumber(viewsPeak)} views in one minute
          </p>
          <SeriesChart
            series={[
              {
                key: "views",
                label: "Views / min",
                emphasis: "primary",
                values: viewsPerMin,
                summary: `peak ${formatNumber(viewsPeak)}`,
              },
              {
                key: "clicks",
                label: "Clicks / min",
                emphasis: "secondary",
                values: clicksPerMin,
                summary: `peak ${formatNumber(clicksPeak)}`,
              },
            ]}
            axisLabels={MINUTE_LABELS}
            pointLabels={MINUTE_LABELS}
            formatValue={formatNumber}
            ariaLabel={`Views (solid) and link clicks (dashed) per minute over the last 60 minutes: ${formatNumber(viewsNow)} views and ${formatNumber(clicksNow)} clicks in the last complete minute, peaking at ${formatNumber(viewsPeak)} views.`}
            height={190}
          />
        </ChartCard>
      </div>

      <LiveTopKytes />
    </>
  );
}
