import { Router } from "express";
import { UserRole, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createAlert, deactivateAlert, listActiveAlerts, listAlerts, publishAlert, updateAlert } from "./service";
import { alertQuerySchema, createAlertSchema, updateAlertSchema } from "./validation";

export const alertRouter = Router();

alertRouter.use(authenticate);

alertRouter.get(
  "/active",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const data = await listActiveAlerts(limit);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

alertRouter.get(
  "/",
  validate(alertQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listAlerts(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

alertRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(createAlertSchema),
  asyncHandler(async (req, res) => {
    const data = await createAlert(req.body, req.user!.id);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

alertRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(updateAlertSchema),
  asyncHandler(async (req, res) => {
    const data = await updateAlert(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

alertRouter.patch(
  "/:id/publish",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  asyncHandler(async (req, res) => {
    const data = await publishAlert(req.params.id, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

alertRouter.patch(
  "/:id/deactivate",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  asyncHandler(async (req, res) => {
    const data = await deactivateAlert(req.params.id, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
