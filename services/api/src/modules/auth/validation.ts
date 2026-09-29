import { z } from "zod";
import { UserRole } from "@dmis/shared";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const loginSchema = z.object({
  email,
  // No strength rules on login — only presence. bcrypt ignores bytes past 72.
  password: z.string().min(1, "Password is required").max(72),
});

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(1, "Name is required").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
  role: z.enum(Object.values(UserRole) as [UserRole, ...UserRole[]]),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{5,19}$/, "Enter a valid phone number")
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
