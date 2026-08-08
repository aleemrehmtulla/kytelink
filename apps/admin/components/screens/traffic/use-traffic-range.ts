import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { TrafficGranularity } from "../../../lib/admin-source";

// `trafficSeries`'s zod input defaults `granularity`, so the inferred type is
// optional; the UI always has a concrete value to show.
export type Granularity = NonNullable<TrafficGranularity>;

interface TrafficRange {
  from: string;
  to: string;
}

interface TrafficQuery extends TrafficRange {
  granularity: Granularity;
}

export interface UseTrafficRangeResult extends TrafficRange {
  granularity: Granularity;
  /**
   * The settled range to fetch on. Editing a `datetime-local` fires a change
   * per segment — the year alone walks through 0002, 0020, 0202 before it
   * means anything — and each of those windows is rejected by the API, so
   * querying the live value flipped every card to an error box and back on
   * every keystroke. `from`/`to`/`granularity` above stay live for the picker.
   */
  query: TrafficQuery;
  /** A preset carries its granularity so both land in a single write. */
  setRange: (next: TrafficRange, granularity?: Granularity) => void;
  setGranularity: (next: Granularity) => void;
  durationLabel: string;
  previousLabel: string;
}

const SETTLE_MS = 300;

const GRANULARITIES: readonly string[] = ["hour", "day", "week"];
const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 30;

function isGranularity(value: unknown): value is Granularity {
  return typeof value === "string" && GRANULARITIES.includes(value);
}

function isInstant(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value))
  );
}

function defaultRange(): TrafficRange & { granularity: Granularity } {
  const to = new Date();
  to.setSeconds(0, 0);
  return {
    from: new Date(to.getTime() - DEFAULT_DAYS * DAY_MS).toISOString(),
    to: to.toISOString(),
    granularity: "day",
  };
}

function describeDuration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours <= 1.5) return "hour";
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

export function useTrafficRange(): UseTrafficRangeResult {
  const router = useRouter();

  // The URL is the single source of truth so a bookmarked "last month, weekly"
  // reopens identically; this state only holds the once-computed default, so the
  // fetch inputs stay referentially stable across renders.
  const [initial] = useState(defaultRange);

  const routerQuery = router.query;
  const state = useMemo(
    () => ({
      from: isInstant(routerQuery.from) ? routerQuery.from : initial.from,
      to: isInstant(routerQuery.to) ? routerQuery.to : initial.to,
      granularity: isGranularity(routerQuery.g) ? routerQuery.g : initial.granularity,
    }),
    [routerQuery.from, routerQuery.to, routerQuery.g, initial],
  );

  // The picker edits this draft, so typing is instant; the URL is written only
  // once editing settles. Debouncing downstream of the URL doesn't work —
  // `router.replace` is async, so the intermediate values arrive spread out and
  // each one settles on its own.
  const [draft, setDraft] = useState<TrafficQuery | null>(null);
  const [seen, setSeen] = useState(state);
  const timer = useRef<number | undefined>(undefined);

  // A URL change — our own settled write, or back/forward — retires the draft.
  if (seen !== state) {
    setSeen(state);
    setDraft(null);
  }

  const { from, to, granularity } = draft ?? state;

  useEffect(
    () => () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    },
    [],
  );

  const write = useCallback(
    (patch: Partial<TrafficQuery>) => {
      const next = { ...(draft ?? state), ...patch };
      setDraft(next);
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void router.replace(
          {
            pathname: router.pathname,
            query: { from: next.from, to: next.to, g: next.granularity },
          },
          undefined,
          { shallow: true },
        );
      }, SETTLE_MS);
    },
    [router, state, draft],
  );

  const setRange = useCallback(
    (next: TrafficRange, nextGranularity?: Granularity) =>
      write(nextGranularity ? { ...next, granularity: nextGranularity } : next),
    [write],
  );
  const setGranularity = useCallback(
    (next: Granularity) => write({ granularity: next }),
    [write],
  );

  // Labels describe the data on screen, so they follow the fetched range —
  // otherwise "vs previous 7 days" would flip a beat before the numbers do.
  const spanMs = Math.max(0, Date.parse(state.to) - Date.parse(state.from));
  const durationLabel = describeDuration(spanMs);

  return {
    from,
    to,
    granularity,
    query: state,
    setRange,
    setGranularity,
    durationLabel,
    previousLabel: `vs previous ${durationLabel}`,
  };
}
