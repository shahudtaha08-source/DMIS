import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "../lib/api";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: ApiClientError };

/**
 * Per-module data loading with explicit loading / error / success states and
 * retry. Feature pages use this so one failing request shows an inline error
 * for that page only (plan §6, §42).
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    fnRef
      .current(controller.signal)
      .then((data) => !controller.signal.aborted && setState({ status: "success", data, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiClientError ? err : new ApiClientError("network", 0, "UNKNOWN", "Something went wrong. Please try again.");
        setState({ status: "error", data: null, error });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
