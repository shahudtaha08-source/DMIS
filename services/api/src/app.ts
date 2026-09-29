import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { errorHandler } from "./middleware/errorHandler";
import { createApiRouter, type ApiRouterOptions } from "./routes";

export function createApp(options: ApiRouterOptions = {}) {
  const app = express();

  // Behind Render's proxy, req.ip must come from X-Forwarded-For or the
  // login rate limiter would treat every client as one IP.
  if (env.isProduction) app.set("trust proxy", 1);

  // Shared infrastructure only — module-specific logic never lives here
  // (docs/ARCHITECTURE.md "genuinely shared infrastructure").
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use("/api", createApiRouter(options));

  // Order matters: 404 handler catches anything no module router matched,
  // errorHandler is always last so every thrown/forwarded error — from any
  // module — lands in one place and returns the shared envelope.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
