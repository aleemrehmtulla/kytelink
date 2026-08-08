import { useCallback, useEffect, useRef, useState } from "react";

type PagedQueryStatus = "loading" | "success" | "error";

export interface UsePagedQueryResult<TOut> {
  data: TOut | undefined;
  status: PagedQueryStatus;
  error: unknown;
  reload: () => void;
}

const UNSET = Symbol("unset");

interface Settled<TOut> {
  key: string;
  data: TOut | undefined;
  error: unknown;
}

/**
 * Paged sibling of `use-async`: the last successful page stays mounted while the
 * next input loads (DataTable dims instead of blanking), and a generation ref
 * drops responses that land out of order.
 */
export function usePagedQuery<TInput extends { page?: number; pageSize?: number }, TOut>(
  run: (input: TInput) => Promise<TOut>,
  input: TInput,
): UsePagedQueryResult<TOut> {
  const [generation, setGeneration] = useState(0);
  const [settled, setSettled] = useState<Settled<TOut> | null>(null);

  const key = `${generation}:${JSON.stringify(input)}`;

  const runRef = useRef(run);
  const inputRef = useRef(input);
  const inFlightRef = useRef(0);

  useEffect(() => {
    runRef.current = run;
    inputRef.current = input;
  });

  useEffect(() => {
    inFlightRef.current += 1;
    const attempt = inFlightRef.current;
    runRef
      .current(inputRef.current)
      .then((result) => {
        if (inFlightRef.current !== attempt) return;
        setSettled({ key, data: result, error: UNSET });
      })
      .catch((caught: unknown) => {
        if (inFlightRef.current !== attempt) return;
        setSettled((previous) => ({ key, data: previous?.data, error: caught }));
      });
  }, [key]);

  const reload = useCallback(() => setGeneration((value) => value + 1), []);

  const isCurrent = settled?.key === key;
  const status: PagedQueryStatus = !isCurrent
    ? "loading"
    : settled.error !== UNSET
      ? "error"
      : "success";

  return {
    data: settled?.data,
    status,
    error: settled && settled.error !== UNSET ? settled.error : undefined,
    reload,
  };
}
