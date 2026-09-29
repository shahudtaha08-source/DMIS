import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@dmis/shared";
import { env } from "../../config/env";

const ISSUER = "dmis-api";

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(user: { id: string; role: UserRole }): string {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    issuer: ISSUER,
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

/** Throws on invalid/expired/wrong-algorithm tokens. Algorithm is pinned — `alg: none` is rejected. */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"], issuer: ISSUER });
  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Malformed token payload");
  }
  return { sub: decoded.sub, role: decoded.role as UserRole };
}
