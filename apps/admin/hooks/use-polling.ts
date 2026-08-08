import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePollingOptions {
  paused?: boolean;
}

export interface UsePollingResult<T> {
  data: T | undefined;
  status: "loading" | "success" | "error";
  lastUpdatedAt: number | null;
  failures: number;
  refresh: () => void;
}

// Pauses while the tab is hidden or the caller pauses it, never overlaps
// requests, and backs off exponentially (up to 8x) on consecutive failures so a
// rate-limited or down API isn't hammered at full speed. `paused` is read from a
// ref rather than the effect deps so toggling it neither tears down the timer
// chain nor fires a fetch at the moment of pausing.
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options: UsePollingOptions = {},
): UsePollingResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const fetcherRef = useRef(fetcher);
  const pausedRef = useRef(options.paused ?? false);
  const forceRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    pausedRef.current = options.paused ?? false;
  }, [options.paused]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let failureCount = 0;
    let timer: number | undefined;

    function schedule() {
      if (cancelled) return;
      timer = window.setTimeout(
        () => void tick(false),
        intervalMs * Math.min(2 ** failureCount, 8),
      );
    }

    async function tick(force: boolean) {
      if (cancelled || inFlight) return;
      if (!force && (pausedRef.current || document.visibilityState === "hidden")) {
        schedule();
        return;
      }
      inFlight = true;
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        failureCount = 0;
        setFailures(0);
        setData(result);
        setLastUpdatedAt(Date.now());
        setStatus("success");
      } catch {
        if (cancelled) return;
        failureCount += 1;
        setFailures(failureCount);
        setStatus("error");
      } finally {
        inFlight = false;
      }
      schedule();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !inFlight && !pausedRef.current) {
        window.clearTimeout(timer);
        void tick(false);
      }
    }

    forceRef.current = () => {
      window.clearTimeout(timer);
      void tick(true);
    };

    // The first load always fetches, even in a background tab: skipping it
    // leaves the screen on its skeleton until the tab is focused, which is
    // indistinguishable from a hang. Only the repeats respect visibility.
    void tick(true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);

  const refresh = useCallback(() => forceRef.current(), []);

  return { data, status, lastUpdatedAt, failures, refresh };
}
