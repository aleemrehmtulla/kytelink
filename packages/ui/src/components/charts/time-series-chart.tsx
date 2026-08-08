import { ACCENT, CHART_NEUTRAL, RADIUS } from "../../tokens";

export interface TimeSeriesPoint {
  date: string;
  views: number;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  height?: number;
  ariaLabel?: string;
}

const VIEW_WIDTH = 480;
const GRID_LINES = 3;

export function TimeSeriesChart({ data, height = 160, ariaLabel }: TimeSeriesChartProps) {
  const max = data.reduce((acc, point) => Math.max(acc, point.views), 0) || 1;
  const step = data.length > 1 ? VIEW_WIDTH / (data.length - 1) : 0;
  const total = data.reduce((acc, point) => acc + point.views, 0);

  const points = data.map((point, index) => {
    const x = data.length > 1 ? index * step : VIEW_WIDTH / 2;
    const y = height - (point.views / max) * (height - 8) - 4;
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1]!.x.toFixed(1)},${height} L${points[0]!.x.toFixed(1)},${height} Z`
      : "";

  const label =
    ariaLabel ??
    `Views over ${data.length} days, ${total.toLocaleString("en-US")} total, peak ${max.toLocaleString("en-US")}`;

  return (
    <figure
      data-kytelink-time-series=""
      style={{ margin: 0, border: `1px solid ${CHART_NEUTRAL.border}`, borderRadius: RADIUS.lg, padding: "12px" }}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const y = ((i + 1) / (GRID_LINES + 1)) * height;
          return (
            <line key={i} x1={0} y1={y} x2={VIEW_WIDTH} y2={y} stroke={CHART_NEUTRAL.gridline} strokeWidth={1} />
          );
        })}

        {data.length > 0 ? (
          <>
            <path d={area} fill={ACCENT} fillOpacity={0.08} stroke="none" />
            <path
              d={line}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <line x1={0} y1={height - 4} x2={VIEW_WIDTH} y2={height - 4} stroke={CHART_NEUTRAL.track} strokeWidth={1} />
        )}
      </svg>
    </figure>
  );
}
