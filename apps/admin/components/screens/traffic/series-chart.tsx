import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ACCENT, CHART_NEUTRAL } from "@kytelink/ui";

export interface SeriesChartSeries {
  key: string;
  label: string;
  values: number[];
  emphasis: "primary" | "secondary";
  summary?: string;
}

export interface SeriesChartProps {
  series: SeriesChartSeries[];
  axisLabels: string[];
  pointLabels: string[];
  ariaLabel: string;
  height?: number;
  formatValue: (value: number) => string;
}

const VIEW_WIDTH = 480;
const AXIS_TICKS = 4;

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const mantissa = value / exponent;
  const step =
    mantissa <= 1
      ? 1
      : mantissa <= 2
        ? 2
        : mantissa <= 2.5
          ? 2.5
          : mantissa <= 5
            ? 5
            : 10;
  return step * exponent;
}

function peakOf(series: SeriesChartSeries[]): number {
  return series.reduce(
    (acc, entry) => entry.values.reduce((inner, value) => Math.max(inner, value), acc),
    0,
  );
}

function tickIndexes(count: number): number[] {
  if (count <= 1) return count === 1 ? [0] : [];
  const wanted = Math.min(AXIS_TICKS, count);
  const indexes = Array.from({ length: wanted }, (_, i) =>
    Math.round((i / (wanted - 1)) * (count - 1)),
  );
  return indexes.filter((value, i) => indexes.indexOf(value) === i);
}

export function SeriesChart({
  series,
  axisLabels,
  pointLabels,
  ariaLabel,
  height = 180,
  formatValue,
}: SeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const count = series.reduce((acc, entry) => Math.max(acc, entry.values.length), 0);
  const scaleMax = niceCeil(peakOf(series));
  const xAt = (index: number) =>
    count > 1 ? (index / (count - 1)) * VIEW_WIDTH : VIEW_WIDTH / 2;
  const yAt = (value: number) => 1 + (1 - Math.min(1, value / scaleMax)) * (height - 2);

  const paths = series.map((entry) => {
    const line = entry.values
      .map(
        (value, index) =>
          `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`,
      )
      .join(" ");
    const last = entry.values.length - 1;
    const area =
      entry.values.length > 0
        ? `${line} L${xAt(last).toFixed(1)},${height} L${xAt(0).toFixed(1)},${height} Z`
        : "";
    return { entry, line, area };
  });

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (count - 1));
    setHover(Math.min(count - 1, Math.max(0, index)));
  }

  const hoverRatio = hover !== null && count > 1 ? hover / (count - 1) : 0;
  const tooltipAlign = hoverRatio < 0.34 ? "start" : hoverRatio > 0.66 ? "end" : "center";

  return (
    <figure className="m-0">
      <div className="flex gap-2">
        <div
          className="text-faint flex w-9 shrink-0 flex-col justify-between text-right text-[10px] leading-none tabular-nums"
          style={{ height }}
          aria-hidden="true"
        >
          <span>{formatValue(scaleMax)}</span>
          <span>{formatValue(scaleMax / 2)}</span>
          <span>{formatValue(0)}</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            width="100%"
            height={height}
            role="img"
            aria-label={ariaLabel}
            preserveAspectRatio="none"
            className="block"
          >
            {[0, 0.5, 1].map((fraction) => (
              <line
                key={fraction}
                x1={0}
                x2={VIEW_WIDTH}
                y1={1 + fraction * (height - 2)}
                y2={1 + fraction * (height - 2)}
                stroke={CHART_NEUTRAL.gridline}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {paths.map(({ entry, line, area }) =>
              entry.values.length === 0 ? null : (
                <g key={entry.key}>
                  {entry.emphasis === "primary" ? (
                    <path d={area} fill={ACCENT} fillOpacity={0.08} stroke="none" />
                  ) : null}
                  <path
                    d={line}
                    fill="none"
                    stroke={ACCENT}
                    strokeOpacity={entry.emphasis === "primary" ? 1 : 0.55}
                    strokeWidth={2}
                    strokeDasharray={entry.emphasis === "primary" ? undefined : "5 4"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ),
            )}
          </svg>

          <div
            className="absolute inset-0"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
          >
            {hover !== null ? (
              <>
                <span
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${hoverRatio * 100}%`,
                    background: CHART_NEUTRAL.border,
                  }}
                  aria-hidden="true"
                />
                {series.map((entry) => {
                  const value = entry.values[hover];
                  if (value === undefined) return null;
                  return (
                    <span
                      key={entry.key}
                      className="rounded-pill border-card absolute h-2 w-2 border-2"
                      style={{
                        left: `${hoverRatio * 100}%`,
                        top: `${(yAt(value) / height) * 100}%`,
                        marginLeft: "-4px",
                        marginTop: "-4px",
                        background: ACCENT,
                        opacity: entry.emphasis === "primary" ? 1 : 0.55,
                      }}
                      aria-hidden="true"
                    />
                  );
                })}
                <div
                  className="rounded-input border-cardline bg-card text-secondary shadow-menu pointer-events-none absolute top-0 z-10 border px-2.5 py-1.5 text-[11px] leading-tight whitespace-nowrap"
                  style={{
                    left: `${hoverRatio * 100}%`,
                    transform:
                      tooltipAlign === "center"
                        ? "translateX(-50%)"
                        : tooltipAlign === "end"
                          ? "translateX(-100%)"
                          : undefined,
                  }}
                  role="status"
                >
                  <span className="text-ink block font-medium">{pointLabels[hover]}</span>
                  {series.map((entry) => {
                    const value = entry.values[hover];
                    if (value === undefined) return null;
                    return (
                      <span key={entry.key} className="block tabular-nums">
                        {entry.label} {formatValue(value)}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="text-faint mt-2 flex justify-between pl-11 text-[10px] tabular-nums"
        aria-hidden="true"
      >
        {tickIndexes(count).map((index) => (
          <span key={index}>{axisLabels[index]}</span>
        ))}
      </div>

      <figcaption className="text-tertiary mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
        {series.map((entry) => (
          <span key={entry.key} className="inline-flex items-center gap-2">
            <span
              className="inline-block w-3.5"
              style={{
                borderTopWidth: "2px",
                borderTopStyle: entry.emphasis === "primary" ? "solid" : "dashed",
                borderTopColor: ACCENT,
                opacity: entry.emphasis === "primary" ? 1 : 0.55,
              }}
              aria-hidden="true"
            />
            {entry.label}
            {entry.summary ? (
              <span className="text-ink font-semibold tabular-nums">{entry.summary}</span>
            ) : null}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
