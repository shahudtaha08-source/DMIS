/**
 * Bootstraps the first ADMIN account (registration is admin-only, so
 * something has to create the first one). Credentials come from the
 * environment — nothing is hardcoded. Idempotent: an existing account with
 * that email is left untouched (its password is never overwritten).
 */
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

export async function main() {
  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("SEED_ADMIN_PASSWORD must be 8-72 characters and contain a letter and a number.");
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Admin user ${email} already exists — left unchanged.`);
      return;
    }
    await prisma.user.create({
      data: { email, name: "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created ADMIN user ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

// Runnable directly and importable by seed.ts (which calls main() in-process).
if (require.main === module) {
  main().catch((err) => {
    console.error("Admin bootstrap failed:", err);
    process.exitCode = 1;
  });
}
