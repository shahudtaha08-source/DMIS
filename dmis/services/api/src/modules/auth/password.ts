import bcrypt from "bcryptjs";
import { env } from "../../config/env";

// Cost factor 12 in real environments; 4 under test so the suite stays fast.
const ROUNDS = env.isTest ? 4 : 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Compared against when the email is unknown, so timing doesn't reveal whether an account exists. */
export const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-equalisation", ROUNDS);
