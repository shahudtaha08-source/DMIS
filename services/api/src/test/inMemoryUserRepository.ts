import { randomUUID } from "node:crypto";
import type { NewUser, UserRecord, UserRepository } from "../modules/auth/userRepository";

/** Test double for UserRepository — lets auth logic be tested without a database. */
export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, UserRecord>();

  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async findById(id: string) {
    return this.users.get(id) ?? null;
  }
  async create(data: NewUser) {
    const user: UserRecord = {
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone ?? null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }
}
