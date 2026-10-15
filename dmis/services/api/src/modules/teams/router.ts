import { Router } from "express";
import { UserRole, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createTeam, listTeams, setTeamStatus, updateTeam } from "./service";
import { createTeamSchema, teamQuerySchema, teamStatusSchema, updateTeamSchema } from "./validation";

export const teamRouter = Router();

teamRouter.use(authenticate);

teamRouter.get(
  "/",
  validate(teamQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listTeams(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

teamRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(createTeamSchema),
  asyncHandler(async (req, res) => {
    const data = await createTeam(req.body, req.user!.id);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

teamRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(updateTeamSchema),
  asyncHandler(async (req, res) => {
    const data = await updateTeam(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

teamRouter.patch(
  "/:id/status",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(teamStatusSchema),
  asyncHandler(async (req, res) => {
    const data = await setTeamStatus(req.params.id, req.body.status, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
