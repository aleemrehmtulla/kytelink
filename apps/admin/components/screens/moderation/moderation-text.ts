import { normalizeUsername } from "@kytelink/schemas";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Admins paste whatever they have: `@name`, `name`, `kytelink.com/name`, or a
 * full profile URL with a trailing slash or query. All four resolve to the same
 * target, so all four are accepted here rather than rejected as typos.
 */
export function parseUsernameInput(raw: string): string {
  let value = raw.trim();
  if (value.length === 0) return "";
  value = value.replace(/^https?:\/\//i, "");
  const slash = value.indexOf("/");
  if (slash !== -1 && value.slice(0, slash).includes(".")) value = value.slice(slash + 1);
  value = value.split(/[?#]/)[0] ?? "";
  value = value.replace(/\/+$/, "");
  const lastSlash = value.lastIndexOf("/");
  if (lastSlash !== -1) value = value.slice(lastSlash + 1);
  value = value.replace(/^@+/, "");
  return normalizeUsername(value);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < MINUTE_MS) return "<1m";
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  return `${Math.floor(ms / DAY_MS)}d`;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
