import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route/middleware handler so a rejected promise is passed
 * to `next(err)` instead of crashing the process. Express only catches
 * *synchronous* throws on its own — every async module handler should be
 * wrapped with this.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
