import { Router } from "express";
import { UserRole, type AnalyticsOverviewDTO, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { getAnalyticsOverview } from "./service";

export const analyticsRouter = Router();

// ADMIN + OFFICER only (docs/AUTH_DESIGN.md role matrix).
analyticsRouter.get(
  "/overview",
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  asyncHandler(async (_req, res) => {
    const data = await getAnalyticsOverview();
    res.json({ success: true, data } satisfies ApiSuccess<AnalyticsOverviewDTO>);
  })
);
