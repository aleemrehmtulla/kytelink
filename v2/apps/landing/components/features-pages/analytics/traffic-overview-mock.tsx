import { StatTile, TimeSeriesChart } from "@kytelink/ui";
import { MOCK_STATS, MOCK_TIME_SERIES } from "../../../lib/mock-analytics";

export function TrafficOverviewMock() {
  return (
    <div className="flex flex-col gap-5 rounded-card border border-cardline bg-card p-5 text-ink sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Traffic overview</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile {...MOCK_STATS.totalViews} />
        <StatTile {...MOCK_STATS.linkClicks} />
        <StatTile {...MOCK_STATS.clickRate} />
        <StatTile {...MOCK_STATS.uniqueVisitors} />
      </div>
      <TimeSeriesChart data={MOCK_TIME_SERIES} ariaLabel="Profile views over the last 7 days" />
    </div>
  );
}
