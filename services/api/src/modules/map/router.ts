import { Router } from "express";
import type { ApiSuccess, MapLayersDTO } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { getMapLayers } from "./service";

export const mapRouter = Router();

mapRouter.get(
  "/layers",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await getMapLayers(Number(req.query.limit) || 500);
    res.json({ success: true, data } satisfies ApiSuccess<MapLayersDTO>);
  })
);
