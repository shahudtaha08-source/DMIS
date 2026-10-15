import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { UserRole } from "@dmis/shared";
import { AppError } from "../lib/AppError";
import { asyncHandler } from "../lib/asyncHandler";
import { verifyToken } from "../modules/auth/tokens";
import { getUserRepository } from "../modules/auth/userRepository";

/**
 * Shared authentication middleware — every protected module router uses
 * `authenticate` (+ `requireRole`). The user is re-loaded from the database
 * on each request so a deactivated account or a changed role takes effect
 * immediately rather than when the token expires. The role checked is the
 * database role, never the one inside the token.
 */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();

  let userId: string;
  try {
    userId = verifyToken(header.slice("Bearer ".length).trim()).sub;
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }

  const user = await getUserRepository().findById(userId);
  if (!user || !user.isActive) throw AppError.unauthorized("Invalid or expired token");

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
});

/** Use after `authenticate`: `router.post("/x", authenticate, requireRole(UserRole.ADMIN), handler)`. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
