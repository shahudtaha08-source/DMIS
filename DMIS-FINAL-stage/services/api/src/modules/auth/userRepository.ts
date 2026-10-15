/**
 * Data-access layer for the auth module (docs/ARCHITECTURE.md per-module
 * contract). The rest of the module depends only on the `UserRepository`
 * interface; the Prisma implementation is the default, and tests inject an
 * in-memory one via `setUserRepository`.
 */
import type { UserRole } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone?: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: NewUser): Promise<UserRecord>;
}

export class PrismaUserRepository implements UserRepository {
  private db() {
    if (!isDatabaseAvailable()) {
      throw AppError.serviceUnavailable("Service temporarily unavailable. Please try again shortly.", "auth");
    }
    return prisma;
  }

  findByEmail(email: string) {
    return this.db().user.findUnique({ where: { email } }) as Promise<UserRecord | null>;
  }

  findById(id: string) {
    return this.db().user.findUnique({ where: { id } }) as Promise<UserRecord | null>;
  }

  async create(data: NewUser) {
    try {
      return (await this.db().user.create({ data })) as UserRecord;
    } catch (err) {
      // Unique-constraint race: two registrations for the same email at once.
      if ((err as { code?: string }).code === "P2002") {
        throw AppError.conflict("An account with this email already exists", "auth");
      }
      throw err;
    }
  }
}

let current: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  return (current ??= new PrismaUserRepository());
}

export function setUserRepository(repo: UserRepository | null) {
  current = repo;
}
