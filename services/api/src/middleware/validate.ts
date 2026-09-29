import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../lib/AppError";

type ValidateTarget = "body" | "query" | "params";

/**
 * Per-module validation, used as `validate(schema, "body")` in a module's
 * router. Each module owns its own schema (docs/ARCHITECTURE.md "per-module
 * contract") — this is just the shared plumbing that turns a Zod failure
 * into the shared error envelope instead of an unhandled exception.
 */
export function validate(schema: ZodSchema, target: ValidateTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join(".") || target}: ${e.message}`)
        .join("; ");
      return next(AppError.validation(message));
    }
    req[target] = result.data;
    next();
  };
}
