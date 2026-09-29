import type { AuthResponseDTO, UserDTO } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { signToken } from "./tokens";
import { getUserRepository, type UserRecord } from "./userRepository";
import type { LoginInput, RegisterInput } from "./validation";

/** Never includes passwordHash. */
export function toUserDTO(u: UserRecord): UserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    phone: u.phone,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function login({ email, password }: LoginInput): Promise<AuthResponseDTO> {
  const repo = getUserRepository();
  const user = await repo.findByEmail(email);
  // Always run one bcrypt comparison, and return one generic message for
  // unknown email / wrong password / deactivated account, so responses and
  // timing don't reveal which accounts exist.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk || !user.isActive) {
    throw AppError.unauthorized("Invalid email or password", "auth");
  }
  return { token: signToken(user), user: toUserDTO(user) };
}

export async function register(input: RegisterInput): Promise<UserDTO> {
  const repo = getUserRepository();
  if (await repo.findByEmail(input.email)) {
    throw AppError.conflict("An account with this email already exists", "auth");
  }
  const user = await repo.create({
    email: input.email,
    name: input.name,
    role: input.role,
    phone: input.phone ?? null,
    passwordHash: await hashPassword(input.password),
  });
  return toUserDTO(user);
}

export async function refresh(userId: string): Promise<AuthResponseDTO> {
  const user = await getUserRepository().findById(userId);
  if (!user || !user.isActive) throw AppError.unauthorized("Invalid or expired token", "auth");
  return { token: signToken(user), user: toUserDTO(user) };
}
