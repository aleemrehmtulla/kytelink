import { ACCENT } from "@kytelink/ui";
import { formatNumber, formatPercentPoints } from "../../../lib/format";

export interface BarListRow {
  key: string;
  label: string;
  title?: string;
  value: number;
  sharePct: number;
}

export interface BarListProps {
  rows: BarListRow[];
  valueNoun: string;
}

export function BarList({ rows, valueNoun }: BarListProps) {
  const peak = rows.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink truncate" title={row.title ?? row.label}>
              {row.label}
            </span>
            <span className="text-tertiary shrink-0 tabular-nums">
              <span className="text-ink font-semibold">{formatNumber(row.value)}</span>{" "}
              {valueNoun} · {formatPercentPoints(row.sharePct)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={row.value}
            aria-valuemin={0}
            aria-valuemax={peak}
            aria-label={`${row.label}: ${formatNumber(row.value)} ${valueNoun}, ${formatPercentPoints(row.sharePct)} of the total`}
            className="rounded-pill bg-tint-hover mt-1.5 h-2"
          >
            <div
              className="rounded-pill h-2"
              style={{
                width: `${Math.max(2, (row.value / peak) * 100)}%`,
                background: ACCENT,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
