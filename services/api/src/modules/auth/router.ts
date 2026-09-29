import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ApiErrorCode, UserRole, type ApiSuccess } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getUserRepository } from "./userRepository";
import { login, refresh, register, toUserDTO } from "./service";
import { loginSchema, registerSchema } from "./validation";

export interface AuthRouterOptions {
  /** Max login attempts per IP per 15 minutes. Default 10. */
  loginRateLimitMax?: number;
}

export function createAuthRouter(options: AuthRouterOptions = {}) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.loginRateLimitMax ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(ApiErrorCode.RATE_LIMITED, "Too many login attempts. Please try again later.", { module: "auth" })),
  });

  router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const data = await login(req.body);
      res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
    })
  );

  // Admin-only: accounts are created by an administrator, not self-service.
  // The first ADMIN is bootstrapped by `npm run db:seed` (SEED_ADMIN_* env vars).
  router.post(
    "/register",
    authenticate,
    requireRole(UserRole.ADMIN),
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const data = await register(req.body);
      res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
    })
  );

  // Sliding session: a still-valid token can be exchanged for a fresh one.
  router.post(
    "/refresh",
    authenticate,
    asyncHandler(async (req, res) => {
      const data = await refresh(req.user!.id);
      res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
    })
  );

  router.get(
    "/me",
    authenticate,
    asyncHandler(async (req, res) => {
      const user = await getUserRepository().findById(req.user!.id);
      if (!user) throw AppError.unauthorized("Invalid or expired token", "auth");
      const data = toUserDTO(user);
      res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
    })
  );

  return router;
}
