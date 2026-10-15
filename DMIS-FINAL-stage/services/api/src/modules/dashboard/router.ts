import { Router } from "express";
import type { ApiSuccess, DashboardSummaryDTO } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { getDashboardSummary } from "./service";

export const dashboardRouter = Router();

// All roles read the dashboard (see docs/AUTH_DESIGN.md role matrix) — no requireRole.
dashboardRouter.get(
  "/summary",
  authenticate,
  asyncHandler(async (_req, res) => {
    const data = await getDashboardSummary();
    res.json({ success: true, data } satisfies ApiSuccess<DashboardSummaryDTO>);
  })
);
