import { useCallback, useEffect, useState } from "react";
import { fetchHealth, type ApiHealth } from "../lib/api";

export type ApiStatus = ApiHealth | { state: "checking"; database?: undefined };

/** Polls the public health endpoint. Real data — drives the topbar indicator and the dashboard status card. */
export function useApiStatus(intervalMs = 30_000) {
  const [status, setStatus] = useState<ApiStatus>({ state: "checking" });

  const check = useCallback(async (signal?: AbortSignal) => {
    const result = await fetchHealth(signal);
    if (!signal?.aborted) setStatus(result);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    const id = setInterval(() => void check(controller.signal), intervalMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [check, intervalMs]);

  return { status, refresh: () => void check() };
}
