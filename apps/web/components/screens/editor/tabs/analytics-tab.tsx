import { useEffect, useMemo, useState } from "react";
import {
  CountrySplit,
  DeviceSplit,
  ReferrersList,
  StatTile,
  TimeSeriesChart,
  TopLinksBarList,
} from "@kytelink/ui";
import { useApp } from "../../../../lib/app-context";
import { useEditor } from "../../../../lib/editor/editor-context";
import { Spinner } from "../../../ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type {
  AnalyticsOverview,
  CountriesResult,
  DevicesResult,
  ReferrersResult,
  TimeSeriesResult,
  TopLinksResult,
} from "../../../../lib/api/types";

interface AnalyticsData {
  overview: AnalyticsOverview;
  series: TimeSeriesResult;
  topLinks: TopLinksResult;
  referrers: ReferrersResult;
  devices: DevicesResult;
  countries: CountriesResult;
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function AnalyticsTab() {
  const { api, handleError } = useApp();
  const { kyte } = useEditor();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let active = true;
    const input = { kyteId: kyte.id, days };
    Promise.all([
      api.analytics.overview(input),
      api.analytics.timeSeries(input),
      api.analytics.topLinks(input),
      api.analytics.referrers(input),
      api.analytics.devices(input),
      api.analytics.countries(input),
    ])
      .then(([overview, series, topLinks, referrers, devices, countries]) => {
        if (active) setData({ overview, series, topLinks, referrers, devices, countries });
      })
      .catch((error) => handleError(error));
    return () => {
      active = false;
    };
  }, [api, kyte.id, days, handleError]);

  const derived = useMemo(() => {
    if (!data) return null;
    const { totalViews, totalClicks } = data.overview;
    const points = data.series.points;
    const peak = points.reduce(
      (best, point) => (point.views > best.views ? point : best),
      { date: "", views: 0 },
    );
    return {
      totalViews,
      totalClicks,
      clickRate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0,
      avgPerDay: Math.round(totalViews / days),
      peakViews: peak.views,
      peakDate: peak.views > 0 ? peak.date : null,
    };
  }, [data, days]);

  const periodSelect = (
    <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
      <SelectTrigger className="h-9 w-full gap-2 sm:w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">Last 7 days</SelectItem>
        <SelectItem value="30">Last 30 days</SelectItem>
        <SelectItem value="90">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );

  if (!data || !derived) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Analytics</h2>
            <p className="mt-0.5 text-[13px] text-tertiary">Loading your latest numbers…</p>
          </div>
          {periodSelect}
        </div>
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner size={26} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Analytics</h2>
          <p className="mt-0.5 text-[13px] text-tertiary">
            {formatCount(derived.totalViews)} views · {formatCount(derived.totalClicks)} clicks in the
            last {days} days
          </p>
        </div>
        {periodSelect}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <StatTile label="Page views" value={derived.totalViews} />
        <StatTile label="Link clicks" value={derived.totalClicks} />
        <StatTile label="Click rate" value={`${derived.clickRate}%`} />
        <StatTile label="Avg views / day" value={derived.avgPerDay} />
        <StatTile
          label="Busiest day"
          value={derived.peakViews}
          hint={derived.peakDate ? formatShortDate(derived.peakDate) : "No views yet"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page views · last {days} days</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart data={data.series.points} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top links</CardTitle>
          </CardHeader>
          <CardContent>
            <TopLinksBarList data={data.topLinks.links} emptyLabel="No links have been clicked yet!" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top traffic sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ReferrersList data={data.referrers.referrers} emptyLabel="No traffic sources yet!" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="flex items-center gap-1.5 self-start rounded-pill border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-secondary outline-none transition-colors hover:bg-tint"
        >
          {showAdvanced ? "Hide audience breakdown" : "Show audience breakdown"}
          <span aria-hidden="true" className="text-tertiary">
            {showAdvanced ? "▴" : "▾"}
          </span>
        </button>

        {showAdvanced ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceSplit data={data.devices.devices} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <CountrySplit data={data.countries.countries} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
