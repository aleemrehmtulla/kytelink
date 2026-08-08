import { useEffect, useState } from "react";
import { Toggle } from "../../ui/toggle";

export interface PollStatusProps {
  lastUpdatedAt: number | null;
  paused: boolean;
  stale: boolean;
  intervalSeconds: number;
  onTogglePause: () => void;
  onRefresh: () => void;
}

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatAge(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function PollStatus({
  lastUpdatedAt,
  paused,
  stale,
  intervalSeconds,
  onTogglePause,
  onRefresh,
}: PollStatusProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const age =
    lastUpdatedAt === null ? null : Math.max(0, Math.round((now - lastUpdatedAt) / 1000));
  const detail = stale
    ? `frozen — last good update ${age === null ? "never" : formatAge(age)}`
    : paused
      ? `paused at ${age === null ? "the first load" : formatAge(age)}`
      : `updated ${age === null ? "never" : formatAge(age)}`;
  const ringActive = !paused && !stale && lastUpdatedAt !== null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        role="status"
        className={`text-[12px] tabular-nums ${stale ? "text-danger" : "text-tertiary"}`}
      >
        {detail}
      </span>

      <button
        type="button"
        onClick={onRefresh}
        aria-label={`Refresh now — ${detail}`}
        title="Refresh now"
        className="rounded-pill border-border bg-card text-secondary hover:border-accent-border hover:text-ink relative flex h-8 w-8 cursor-pointer items-center justify-center border"
      >
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r={RADIUS}
            className={stale ? "stroke-danger/25" : "stroke-accent/15"}
            strokeWidth="2.5"
          />
          {ringActive ? (
            <circle
              // Remounting on each update restarts the drain from full.
              key={lastUpdatedAt}
              cx="12"
              cy="12"
              r={RADIUS}
              className="poll-ring stroke-accent"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              style={
                {
                  "--poll-circumference": CIRCUMFERENCE,
                  "--poll-interval": `${intervalSeconds}s`,
                } as React.CSSProperties
              }
            />
          ) : null}
        </svg>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 11a8 8 0 1 0-.6 4" />
          <path d="M20 5v6h-6" />
        </svg>
      </button>

      <label className="text-secondary flex cursor-pointer items-center gap-2 text-[13px]">
        <Toggle checked={!paused} onChange={onTogglePause} label="Auto-refresh" />
        <span>
          Auto-refresh
          <span className="text-faint"> · {intervalSeconds}s</span>
        </span>
      </label>
    </div>
  );
}
