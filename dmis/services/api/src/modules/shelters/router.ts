import { Router } from "express";
import { UserRole, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createShelter, getShelter, listShelters, updateOccupancy, updateShelter } from "./service";
import { createShelterSchema, occupancySchema, shelterQuerySchema, updateShelterSchema } from "./validation";

export const shelterRouter = Router();

shelterRouter.use(authenticate);

shelterRouter.get(
  "/",
  validate(shelterQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listShelters(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

shelterRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(createShelterSchema),
  asyncHandler(async (req, res) => {
    const data = await createShelter(req.body, req.user!.id);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

shelterRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await getShelter(req.params.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

shelterRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(updateShelterSchema),
  asyncHandler(async (req, res) => {
    const data = await updateShelter(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

shelterRouter.patch(
  "/:id/occupancy",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(occupancySchema),
  asyncHandler(async (req, res) => {
    const data = await updateOccupancy(req.params.id, req.body.currentOccupancy, req.body.status, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
