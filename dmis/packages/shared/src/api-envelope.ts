/**
 * The one response shape every /api/* route returns. See
 * docs/ARCHITECTURE.md §3 ("Shared error envelope") and
 * docs/API_DESIGN.md for context. Implemented by the API's shared error
 * middleware in Chunk 3, consumed by both the web api client and the
 * Flutter Dio interceptor.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  module?: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Common error codes reused across modules — module-specific codes may be added, not redefined. */
export const ApiErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
