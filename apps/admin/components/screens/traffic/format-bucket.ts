import type { Granularity } from "./use-traffic-range";

// Buckets are cut on UTC boundaries by the resolver and arrive in three shapes:
// "2026-07-25", "2026-07-25T00:00:00Z", and ClickHouse's designator-less
// "2026-07-25 00:00:00". All three are UTC, so labels are rendered in UTC too —
// formatting a UTC day boundary in the viewer's zone shifts it by a day.
export function parseBucketInstant(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);
  return new Date(`${value.replace(" ", "T")}Z`);
}

const hourAxis = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" });
const hourFull = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  timeZone: "UTC",
});
const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const GRANULARITY_NOUN: Record<Granularity, string> = {
  hour: "hourly",
  day: "daily",
  week: "weekly",
};

export const GRANULARITY_BUCKET: Record<Granularity, string> = {
  hour: "hour",
  day: "day",
  week: "week",
};

export function formatBucketAxis(iso: string, granularity: Granularity): string {
  const date = parseBucketInstant(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return granularity === "hour" ? hourAxis.format(date) : dayLabel.format(date);
}

export function formatBucketFull(iso: string, granularity: Granularity): string {
  const date = parseBucketInstant(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (granularity === "hour") return `${hourFull.format(date)} UTC`;
  if (granularity === "week") return `Week of ${dayLabel.format(date)}`;
  return dayLabel.format(date);
}

export function formatHourOfDay(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  return `${String(normalized).padStart(2, "0")}:00`;
}
