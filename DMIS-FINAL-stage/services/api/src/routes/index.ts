import { Router } from "express";
import { healthRouter } from "../modules/health/router";
import { createAuthRouter, type AuthRouterOptions } from "../modules/auth/router";
import { dashboardRouter } from "../modules/dashboard/router";
import { historicalRouter } from "../modules/historical/router";
import { incidentRouter } from "../modules/incidents/router";
import { alertRouter } from "../modules/alerts/router";
import { shelterRouter } from "../modules/shelters/router";
import { resourceRouter } from "../modules/resources/router";
import { teamRouter } from "../modules/teams/router";
import { mapRouter } from "../modules/map/router";
import { analyticsRouter } from "../modules/analytics/router";

export interface ApiRouterOptions {
  auth?: AuthRouterOptions;
}

/**
 * Every module gets exactly one line here, mounting its own router. This
 * file only wires modules to their base path — no business logic.
 *
 * Each module is an isolated Express router, so a failure inside one is
 * caught by that module's own handlers and never propagates to a sibling
 * (docs/ARCHITECTURE.md §3).
 */
export function createApiRouter(options: ApiRouterOptions = {}) {
  const apiRouter = Router();
  apiRouter.use("/health", healthRouter); // public
  apiRouter.use("/auth", createAuthRouter(options.auth));

  // Read-only historical intelligence (783 imported records).
  apiRouter.use("/historical-disasters", historicalRouter);

  // Live operations — the same routers serve the web app and the Flutter app.
  apiRouter.use("/incidents", incidentRouter);
  apiRouter.use("/alerts", alertRouter);
  apiRouter.use("/shelters", shelterRouter);
  apiRouter.use("/resources", resourceRouter);
  apiRouter.use("/teams", teamRouter);
  apiRouter.use("/map", mapRouter);
  apiRouter.use("/analytics", analyticsRouter);
  apiRouter.use("/dashboard", dashboardRouter);

  return apiRouter;
}
