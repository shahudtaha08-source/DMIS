import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError";

/** Mounted after every module router, before errorHandler. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`No route matches ${req.method} ${req.path}`));
}
