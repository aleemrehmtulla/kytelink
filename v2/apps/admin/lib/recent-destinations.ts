export interface RecentDestination {
  id: string;
  title: string;
  subtitle: string;
  badge: string | null;
  href: string;
  kindLabel: string;
}

const KEY = "kytelink.admin.recent-destinations";
const LIMIT = 5;

function isRecentDestination(value: unknown): value is RecentDestination {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.href === "string"
  );
}

export function readRecentDestinations(): RecentDestination[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentDestination).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function rememberDestination(entry: RecentDestination): void {
  try {
    const next = [
      entry,
      ...readRecentDestinations().filter((item) => item.id !== entry.id),
    ].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

export function clearRecentDestinations(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
}
