import { Router } from "express";
import { UserRole, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { assignTeam, createIncident, getIncident, listIncidents, updateIncident, updateIncidentStatus } from "./service";
import { assignTeamSchema, createIncidentSchema, incidentQuerySchema, incidentStatusSchema, updateIncidentSchema } from "./validation";

/**
 * Incident Management (Chunk 8) — the operational heart of DMIS.
 *
 * Read for every role; create/edit/status/assign for ADMIN + OFFICER
 * (docs/AUTH_DESIGN.md role matrix — VOLUNTEERs are read-only). Identical
 * handlers serve the web app and the Flutter client, which is what makes the
 * cross-platform workflow real rather than simulated.
 */
export const incidentRouter = Router();

incidentRouter.use(authenticate);

incidentRouter.get(
  "/",
  validate(incidentQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listIncidents(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

incidentRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(createIncidentSchema),
  asyncHandler(async (req, res) => {
    const data = await createIncident(req.body, req.user!);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

incidentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await getIncident(req.params.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

incidentRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(updateIncidentSchema),
  asyncHandler(async (req, res) => {
    const data = await updateIncident(req.params.id, req.body, req.user!);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

incidentRouter.patch(
  "/:id/status",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(incidentStatusSchema),
  asyncHandler(async (req, res) => {
    const data = await updateIncidentStatus(req.params.id, req.body.status, req.user!, req.body.note);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

incidentRouter.patch(
  "/:id/assign-team",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(assignTeamSchema),
  asyncHandler(async (req, res) => {
    const data = await assignTeam(req.params.id, req.body.teamId ?? null, req.user!, req.body.note);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
