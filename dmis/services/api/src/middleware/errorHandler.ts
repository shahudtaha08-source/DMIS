import type { NextFunction, Request, Response } from "express";
import { ApiErrorCode, type ApiError } from "@dmis/shared";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";
import { env } from "../config/env";

/** Mounted after every module router — see docs/API_DESIGN.md response envelope. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, module: err.module }, err.message);
    } else {
      logger.warn({ code: err.code, path: req.path, module: err.module }, err.message);
    }
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, module: err.module },
    };
    return res.status(err.statusCode).json(body);
  }

  // Unexpected error — never leak stack traces / raw driver errors to the client (plan §43).
  logger.error({ err, path: req.path }, "Unhandled error");
  const body: ApiError = {
    success: false,
    error: {
      code: ApiErrorCode.INTERNAL_ERROR,
      message: env.isDevelopment && err instanceof Error ? err.message : "Something went wrong. Please try again.",
    },
  };
  return res.status(500).json(body);
}
