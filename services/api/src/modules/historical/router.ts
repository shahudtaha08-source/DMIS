import { Router } from "express";
import type { ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getFilterOptions, getGeoPoints, getHistoricalDisaster, getHistoricalStats, listHistoricalDisasters } from "./service";
import { historicalQuerySchema } from "./validation";

/**
 * Historical Disaster Explorer (Chunk 7). Read-only, every route authenticated
 * because the dataset is not public. Static paths are declared before `/:id`
 * so "filters"/"stats"/"geo" are never parsed as a record reference.
 */
export const historicalRouter = Router();

historicalRouter.use(authenticate);

historicalRouter.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getFilterOptions() } satisfies ApiSuccess<Awaited<ReturnType<typeof getFilterOptions>>>);
  })
);

historicalRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getHistoricalStats() } satisfies ApiSuccess<Awaited<ReturnType<typeof getHistoricalStats>>>);
  })
);

historicalRouter.get(
  "/geo",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 500;
    res.json({ success: true, data: await getGeoPoints(limit) } satisfies ApiSuccess<Awaited<ReturnType<typeof getGeoPoints>>>);
  })
);

historicalRouter.get(
  "/",
  validate(historicalQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listHistoricalDisasters(req.query as never);
    res.json({ success: true, data: items, meta } satisfies ApiSuccess<typeof items>);
  })
);

historicalRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await getHistoricalDisaster(String(req.params.id));
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  })
);
