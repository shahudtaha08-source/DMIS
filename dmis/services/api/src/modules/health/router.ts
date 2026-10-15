import { Router } from "express";
import type { ApiSuccess } from "@dmis/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { isDatabaseAvailable, getDatabaseInitError, pingDatabase } from "../../db/prisma";

export const healthRouter = Router();

interface HealthData {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  database: "connected" | "unreachable" | "not_initialized";
  databaseDetail?: string;
}

/**
 * GET /api/health — liveness/readiness probe, no auth. Never throws: a
 * database outage is reported as `degraded`, not a 500, so uptime
 * monitors and the deploy pipeline (Chunk 24) can tell "the process is up
 * but the DB is down" apart from "the process is down".
 */
healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    let database: HealthData["database"];
    let databaseDetail: string | undefined;

    if (!isDatabaseAvailable()) {
      database = "not_initialized";
      databaseDetail = getDatabaseInitError() ?? "Prisma Client not initialized";
    } else {
      const reachable = await pingDatabase();
      database = reachable ? "connected" : "unreachable";
    }

    const data: HealthData = {
      status: database === "connected" ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
      ...(databaseDetail ? { databaseDetail } : {}),
    };

    const body: ApiSuccess<HealthData> = { success: true, data };
    res.status(data.status === "ok" ? 200 : 503).json(body);
  })
);
