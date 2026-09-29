/**
 * The one API client for the web app (docs/ARCHITECTURE.md "shared
 * infrastructure"). Every feature module calls `apiRequest`; nobody uses
 * fetch directly. It unwraps the shared envelope and converts every failure
 * (plan §43: 401/403/404/409/422/429/500, timeout, offline) into an
 * `ApiClientError` carrying a user-friendly message — raw server text for
 * 5xx is never shown.
 */
import type { PaginationMeta } from "@dmis/shared";
import { getToken } from "../auth/tokenStore";

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

export type ApiErrorKind = "http" | "network" | "offline" | "timeout" | "invalid-response";

export class ApiClientError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status: number,
    public readonly code: string,
    public readonly userMessage: string
  ) {
    super(userMessage);
    this.name = "ApiClientError";
  }
}

let unauthorizedHandler: (() => void) | null = null;
/** AuthProvider registers this so any 401 on an authenticated call ends the session. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

function friendlyMessage(status: number, serverMessage: string | undefined, isAuthAttempt: boolean): string {
  switch (status) {
    case 401:
      return isAuthAttempt ? serverMessage ?? "Invalid email or password" : "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 409:
      return serverMessage ?? "That conflicts with existing data.";
    case 422:
      return serverMessage ?? "Some of the information you entered isn't valid.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "The service is temporarily unavailable. Please try again shortly.";
    default:
      if (status >= 500) return "Something went wrong on our side. Please try again.";
      return serverMessage ?? "The request could not be completed.";
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Set false for login: sends no token and a 401 is a credentials error, not an expired session. */
  auth?: boolean;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const useAuth = opts.auth !== false;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? 15_000);
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  const token = useAuth ? getToken() : null;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (timedOut) {
      throw new ApiClientError("timeout", 0, "TIMEOUT", "The request took too long. Check your connection and try again.");
    }
    if (opts.signal?.aborted) throw err; // the caller cancelled — not an error to display
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new ApiClientError(
      offline ? "offline" : "network",
      0,
      offline ? "OFFLINE" : "NETWORK",
      offline ? "You appear to be offline. Check your connection and try again." : "Can't reach the server. Please try again in a moment."
    );
  }
  clearTimeout(timer);

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (res.ok) {
    if (json && json.success === true) return { data: json.data as T, meta: json.meta };
    throw new ApiClientError("invalid-response", res.status, "INVALID_RESPONSE", "Received an unexpected response from the server.");
  }

  if (res.status === 401 && useAuth) unauthorizedHandler?.();
  const serverMessage: string | undefined = typeof json?.error?.message === "string" ? json.error.message : undefined;
  throw new ApiClientError(
    "http",
    res.status,
    typeof json?.error?.code === "string" ? json.error.code : `HTTP_${res.status}`,
    friendlyMessage(res.status, serverMessage, !useAuth)
  );
}

export interface ApiHealth {
  state: "online" | "degraded" | "offline";
  /** connected | unreachable | not_initialized when the API answered. */
  database?: string;
}

/** Public health probe. Never throws — an unreachable API is simply `offline`. */
export async function fetchHealth(signal?: AbortSignal): Promise<ApiHealth> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal, headers: { Accept: "application/json" } });
    const json = await res.json();
    const status = json?.data?.status;
    if (status === "ok") return { state: "online", database: json.data.database };
    if (status === "degraded") return { state: "degraded", database: json.data.database };
    return { state: "offline" };
  } catch {
    return { state: "offline" };
  }
}
