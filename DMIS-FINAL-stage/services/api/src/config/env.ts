/**
 * Single place environment variables are read and validated. Every other
 * file imports `env` from here — nobody calls `process.env` directly
 * elsewhere (see docs/ARCHITECTURE.md "genuinely shared infrastructure").
 *
 * Philosophy: fail fast on genuinely malformed config, and on a missing or
 * weak JWT_SECRET in production. In development a clearly-logged insecure
 * fallback secret is used so the server still boots.
 */
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load the monorepo-root .env regardless of which workspace's cwd this is
// run from. Variables already set in the environment are never overridden.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

if (!raw.DATABASE_URL && raw.NODE_ENV !== "test") {
  console.warn(
    "⚠ DATABASE_URL is not set. The server will boot, but every route that touches the database will report unavailable until it's configured (see .env.example)."
  );
}

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-never-use-in-production-000000";

if (raw.NODE_ENV === "production" && (!raw.JWT_SECRET || raw.JWT_SECRET.length < 32)) {
  console.error("❌ JWT_SECRET must be set to a random value of at least 32 characters in production.");
  process.exit(1);
}

if (!raw.JWT_SECRET && raw.NODE_ENV === "development") {
  console.warn("⚠ JWT_SECRET is not set — using an INSECURE development fallback. Set a real value in .env.");
}

export const env = {
  ...raw,
  jwtSecret: raw.JWT_SECRET ?? DEV_FALLBACK_SECRET,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  corsOrigins: raw.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
};
