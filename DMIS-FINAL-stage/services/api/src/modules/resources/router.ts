import { Router } from "express";
import { UserRole, type ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createResource, listResources, listTransactions, postTransaction, updateResource } from "./service";
import { createResourceSchema, resourceQuerySchema, transactionSchema, updateResourceSchema } from "./validation";

export const resourceRouter = Router();

resourceRouter.use(authenticate);

resourceRouter.get(
  "/",
  validate(resourceQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listResources(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

resourceRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(createResourceSchema),
  asyncHandler(async (req, res) => {
    const data = await createResource(req.body, req.user!.id);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

resourceRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(updateResourceSchema),
  asyncHandler(async (req, res) => {
    const data = await updateResource(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

resourceRouter.get(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const data = await listTransactions(req.params.id, Number(req.query.limit) || 25);
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);

resourceRouter.post(
  "/:id/transactions",
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  validate(transactionSchema),
  asyncHandler(async (req, res) => {
    const data = await postTransaction(req.params.id, req.body, req.user!.id);
    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
