import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

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
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const raw = parsed.data;

if (!raw.DATABASE_URL && raw.NODE_ENV !== "test") {
  console.warn(
    "DATABASE_URL is not set. The server will boot, but database routes will be unavailable until it is configured."
  );
}

const DEV_FALLBACK_SECRET =
  "dev-only-insecure-secret-never-use-in-production-000000";

if (
  raw.NODE_ENV === "production" &&
  (!raw.JWT_SECRET || raw.JWT_SECRET.length < 32)
) {
  console.error("JWT_SECRET must be at least 32 characters in production.");
  throw new Error("Invalid JWT_SECRET configuration");
}

const jwtSecret =
  raw.JWT_SECRET ||
  (raw.NODE_ENV === "development"
    ? DEV_FALLBACK_SECRET
    : undefined);

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required.");
}

export const env = {
  ...raw,
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  isProduction: raw.NODE_ENV === "production",
  corsOrigins: raw.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret,
};

export type Env = typeof env;
