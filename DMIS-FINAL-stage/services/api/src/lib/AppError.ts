/**
 * The one error type every module throws for expected/handled failures
 * (not-found, validation, forbidden, etc). The error middleware
 * (middleware/errorHandler.ts) knows how to turn this into the shared
 * envelope from @dmis/shared. Unexpected errors (a genuine bug) are left
 * as plain `Error`s and the handler maps them to a generic 500 without
 * leaking internals — see docs/ARCHITECTURE.md §3 and §43 of the plan
 * (API failure handling).
 */
import { ApiErrorCode, type ApiErrorCode as ApiErrorCodeType } from "@dmis/shared";

const STATUS_BY_CODE: Record<ApiErrorCodeType, number> = {
  [ApiErrorCode.VALIDATION_ERROR]: 422,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  readonly code: ApiErrorCodeType;
  readonly statusCode: number;
  readonly module?: string;

  constructor(code: ApiErrorCodeType, message: string, options?: { module?: string; statusCode?: number }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.module = options?.module;
    this.statusCode = options?.statusCode ?? STATUS_BY_CODE[code] ?? 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static notFound(message: string, module?: string) {
    return new AppError(ApiErrorCode.NOT_FOUND, message, { module });
  }

  static validation(message: string, module?: string) {
    return new AppError(ApiErrorCode.VALIDATION_ERROR, message, { module });
  }

  static unauthorized(message = "Authentication required", module?: string) {
    return new AppError(ApiErrorCode.UNAUTHORIZED, message, { module });
  }

  static forbidden(message = "You don't have permission to do that", module?: string) {
    return new AppError(ApiErrorCode.FORBIDDEN, message, { module });
  }

  static conflict(message: string, module?: string) {
    return new AppError(ApiErrorCode.CONFLICT, message, { module });
  }

  static serviceUnavailable(message: string, module?: string) {
    return new AppError(ApiErrorCode.INTERNAL_ERROR, message, { module, statusCode: 503 });
  }
}
