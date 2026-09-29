/**
 * The single Prisma client instance for the whole API. Every module's
 * repository layer imports `prisma`/`isDatabaseAvailable` from here —
 * nobody instantiates `new PrismaClient()` elsewhere (see
 * docs/ARCHITECTURE.md "genuinely shared infrastructure").
 *
 * Construction is wrapped in try/catch on purpose: if `prisma generate`
 * hasn't been run yet, or DATABASE_URL is missing/misconfigured, the
 * *whole server* should not refuse to boot — per docs/ARCHITECTURE.md §3
 * and plan §42/§44 (error isolation, graceful degradation), only the
 * routes that actually touch the database should report unavailable.
 * `GET /api/health` surfaces this state explicitly.
 */
import { logger } from "../lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientType = any;

let client: PrismaClientType | null = null;
let initError: Error | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require("@prisma/client");
  client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
} catch (err) {
  initError = err as Error;
  logger.error(
    { err: initError.message },
    "Prisma Client failed to initialize — did you run `npx prisma generate`? " +
      "The server will still boot; database-backed routes will report 503 until this is fixed."
  );
}

export const prisma = client as PrismaClientType;

export function isDatabaseAvailable(): boolean {
  return client !== null;
}

export function getDatabaseInitError(): string | null {
  return initError?.message ?? null;
}

/** Cheap connectivity probe used by GET /api/health. Never throws. */
export async function pingDatabase(): Promise<boolean> {
  if (!client) return false;
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Database ping failed");
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (client) await client.$disconnect();
}
