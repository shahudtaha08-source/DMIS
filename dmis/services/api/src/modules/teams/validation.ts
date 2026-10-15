import { z } from "zod";
import { TeamStatus } from "@dmis/shared";

export const teamQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as TeamStatus[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(TeamStatus).includes(s)), "Unknown team status"),
  sort: z.enum(["name", "status", "specialization"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type TeamQuery = z.infer<typeof teamQuerySchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(3, "Team name is required").max(120),
  specialization: z.string().trim().min(2, "Specialization is required").max(120),
  baseLocation: z.string().trim().max(160).nullish(),
  status: z.nativeEnum(TeamStatus).default("AVAILABLE"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = createTeamSchema.partial();

export const teamStatusSchema = z.object({ status: z.nativeEnum(TeamStatus) });
