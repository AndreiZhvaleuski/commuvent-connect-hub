import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type Options = {
  /** Debounce time in ms before firing the fetcher when deps change. */
  debounceMs?: number;
  /** Keep previously loaded data visible while a refetch is in flight. */
  keepPreviousData?: boolean;
};

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; message?: string };
  return (
    e.name === "AbortError" ||
    e.code === "20" ||
    e.code === "ABORT_ERR" ||
    (typeof e.message === "string" && e.message.toLowerCase().includes("abort"))
  );
}

/**
 * Generic async resource hook with built-in cancellation, debounce, and
 * loading/error/data state tracking. The fetcher receives an AbortSignal
 * that should be passed to fetch / supabase via `.abortSignal(signal)`.
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
  opts: Options = {}
): AsyncResourceState<T> & { refetch: () => void } {
  const { debounceMs = 0, keepPreviousData = false } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    controllerRef.current?.abort();
    setLoading(true);
    setError(null);
    if (!keepPreviousData) setData(null);

    const run = () => {
      const controller = new AbortController();
      controllerRef.current = controller;
      fetcherRef
        .current(controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setData(result);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || isAbortError(err)) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });
    };

    if (debounceMs > 0) {
      timeoutId = setTimeout(run, debounceMs);
    } else {
      run();
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  return { data, loading, error, refetch };
}
