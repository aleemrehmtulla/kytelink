import { ACCENT } from "@kytelink/ui";
import { formatNumber } from "../../../lib/format";
import { formatHourOfDay } from "./format-bucket";

export interface HourOfDayChartProps {
  data: { hour: number; views: number }[];
  height?: number;
}

const AXIS_HOURS = [0, 6, 12, 18];

export function buildHourBuckets(data: { hour: number; views: number }[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const row of data) {
    const hour = Math.trunc(row.hour);
    if (hour >= 0 && hour < 24) buckets[hour] = (buckets[hour] ?? 0) + row.views;
  }
  return buckets;
}

export function HourOfDayChart({ data, height = 120 }: HourOfDayChartProps) {
  const buckets = buildHourBuckets(data);
  const peak = buckets.reduce((acc, value) => Math.max(acc, value), 0);
  const peakHour = buckets.indexOf(peak);
  const total = buckets.reduce((acc, value) => acc + value, 0);
  const scale = peak || 1;

  return (
    <figure className="m-0">
      <div
        className="flex items-end gap-[2px]"
        style={{ height }}
        role="img"
        aria-label={
          total === 0
            ? "Views by hour of day in UTC: no views in this window"
            : `Views by hour of day in UTC, ${formatNumber(total)} views total, busiest hour ${formatHourOfDay(peakHour)} UTC with ${formatNumber(peak)} views`
        }
      >
        {buckets.map((value, hour) => (
          <div
            key={hour}
            className="bg-tint-hover relative min-w-0 flex-1 rounded-[3px]"
            style={{ height }}
            title={`${formatHourOfDay(hour)} UTC — ${formatNumber(value)} views`}
          >
            <div
              className="absolute bottom-0 left-0 w-full rounded-[3px]"
              style={{
                height: value === 0 ? 0 : `${Math.max(2, (value / scale) * 100)}%`,
                background: ACCENT,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="text-faint relative mt-1.5 h-3.5 text-[10px] tabular-nums"
        aria-hidden="true"
      >
        {AXIS_HOURS.map((hour) => (
          <span
            key={hour}
            className="absolute top-0"
            style={
              hour === 0
                ? { left: 0 }
                : { left: `${((hour + 0.5) / 24) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            {formatHourOfDay(hour)}
          </span>
        ))}
        <span className="absolute top-0 right-0">23:59 UTC</span>
      </div>
    </figure>
  );
}
