const compactNumberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" });
const fullNumberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});
const percentPointsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const dateWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const dateTimeFullFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatNumber(value: number): string {
  return fullNumberFormatter.format(value);
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** The admin contract returns percentages (`ctrPct`, `pctOfLimit`), not ratios. */
export function formatPercentPoints(pct: number): string {
  return `${percentPointsFormatter.format(pct)}%`;
}

export function formatCount(value: number, singular: string, plural?: string): string {
  const noun = value === 1 ? singular : (plural ?? `${singular}s`);
  return `${fullNumberFormatter.format(value)} ${noun}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTimeFull(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFullFormatter.format(date);
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diff = now.getTime() - date.getTime();

  if (diff < 0) {
    const ahead = -diff;
    if (ahead < MINUTE_MS) return "in a moment";
    if (ahead < HOUR_MS) return `in ${Math.round(ahead / MINUTE_MS)}m`;
    if (ahead < DAY_MS) return `in ${Math.round(ahead / HOUR_MS)}h`;
    return dateFormatter.format(date);
  }

  if (diff < 45_000) return "just now";
  if (diff < HOUR_MS) return `${Math.max(1, Math.floor(diff / MINUTE_MS))}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;

  const dayGap = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / DAY_MS);
  if (dayGap <= 1) return "yesterday";
  if (dayGap < 7) return `${dayGap}d ago`;
  if (date.getFullYear() === now.getFullYear()) return dateFormatter.format(date);
  return dateWithYearFormatter.format(date);
}

/**
 * Postgres stores an unset display name as `""`, not NULL, so `name ?? email`
 * happily renders a blank cell. Anything user-facing that falls back between
 * fields has to go through this — including `typeToConfirm` values, where a
 * blank string would make a confirmation gate pass on an empty input.
 */
export function nonBlank(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function personLabel(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  return nonBlank(name) ?? nonBlank(email) ?? "Unknown account";
}
