/**
 * The one logger instance for the whole API (see docs/ARCHITECTURE.md
 * "genuinely shared infrastructure"). Module code should import this
 * rather than using `console.*` directly. Silent under NODE_ENV=test.
 */
import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.isTest ? "silent" : env.isDevelopment ? "debug" : "info",
  transport: env.isDevelopment
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
    : undefined,
});
