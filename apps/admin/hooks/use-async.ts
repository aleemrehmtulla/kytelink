import { useCallback, useEffect, useState } from "react";

export type AsyncStatus = "loading" | "success" | "error";

export interface UseAsyncResult<T> {
  data: T | undefined;
  status: AsyncStatus;
  error: unknown;
  reload: () => void;
}

const UNSET = Symbol("unset");

export function useAsync<T>(fetcher: () => Promise<T>): UseAsyncResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(UNSET);
  const [generation, setGeneration] = useState(0);
  const [resolved, setResolved] = useState<{ fetcher: () => Promise<T>; generation: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(UNSET);
        setResolved({ fetcher, generation });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught);
        setResolved({ fetcher, generation });
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, generation]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  const isCurrent = resolved?.fetcher === fetcher && resolved?.generation === generation;
  const status: AsyncStatus = !isCurrent ? "loading" : error !== UNSET ? "error" : "success";

  return { data, status, error: error === UNSET ? undefined : error, reload };
}
