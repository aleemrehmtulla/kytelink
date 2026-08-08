import { formatBytes } from "../../../lib/format";

export interface StorageMeterProps {
  bytes: number;
  limitBytes: number | null;
}

export function storageUsagePct(bytes: number, limitBytes: number | null): number | null {
  if (limitBytes === null || limitBytes <= 0) return null;
  return (bytes / limitBytes) * 100;
}

export function storageTone(pct: number | null): "default" | "warning" | "danger" {
  if (pct === null) return "default";
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "default";
}

const FILL_CLASSES = {
  default: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

const PCT_CLASSES = {
  default: "text-tertiary",
  warning: "text-warning",
  danger: "text-danger",
} as const;

export function StorageMeter({ bytes, limitBytes }: StorageMeterProps) {
  const pct = storageUsagePct(bytes, limitBytes);
  const tone = storageTone(pct);

  // Both branches are two nowrap lines tall, so every row in the table is the
  // same height whether or not the org has an override.
  if (pct === null || limitBytes === null) {
    return (
      <div className="flex flex-col items-end gap-1 whitespace-nowrap">
        <span className="tabular-nums text-ink">{formatBytes(bytes)}</span>
        <span className="text-[11px] text-faint">no limit set</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-end gap-1 whitespace-nowrap"
      title={`${formatBytes(bytes)} of ${formatBytes(limitBytes)}`}
    >
      <span className="tabular-nums text-ink">{formatBytes(bytes)}</span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-1 w-16 overflow-hidden rounded-pill bg-tint-hover"
          role="img"
          aria-label={`${Math.round(pct)} percent of the storage limit used`}
        >
          <span
            className={`block h-full rounded-pill ${FILL_CLASSES[tone]}`}
            style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
          />
        </span>
        <span className={`text-[11px] tabular-nums ${PCT_CLASSES[tone]}`}>{Math.round(pct)}%</span>
      </span>
    </div>
  );
}
