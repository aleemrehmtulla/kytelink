import { formatPercentPoints } from "../../../lib/format";
import { meterTone, type MeterTone } from "./storage-format";

const TONE_FILL: Record<MeterTone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
};

export interface StorageMeterProps {
  /** Percentage points of the limit used (0–100+). Never render this without a limit. */
  pctOfLimit: number;
  label: string;
  size?: "sm" | "lg";
}

export function StorageMeter({ pctOfLimit, label, size = "sm" }: StorageMeterProps) {
  const filled = pctOfLimit <= 0 ? 0 : Math.max(2, Math.min(pctOfLimit, 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(Math.round(pctOfLimit), 100)}
      aria-valuetext={`${formatPercentPoints(pctOfLimit)} of the limit used`}
      className={`w-full overflow-hidden rounded-pill bg-tint-hover ${size === "lg" ? "h-2.5" : "h-1.5"}`}
    >
      <div
        className={`h-full rounded-pill ${TONE_FILL[meterTone(pctOfLimit)]}`}
        style={{ width: `${filled}%` }}
      />
    </div>
  );
}
