import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { disconnectDatabase, isDatabaseAvailable } from "./db/prisma";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(
    `DMIS API listening on port ${env.API_PORT} (${env.NODE_ENV}) — database ${
      isDatabaseAvailable() ? "initialized" : "NOT initialized, see startup warnings above"
    }`
  );
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await disconnectDatabase();
    logger.info("Shutdown complete.");
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
