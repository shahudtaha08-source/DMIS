import { z } from "zod";
import { ShelterStatus } from "@dmis/shared";

export const shelterQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as ShelterStatus[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(ShelterStatus).includes(s)), "Unknown shelter status"),
  /** Hide shelters with no free beds — the field responder's default view. */
  hasSpace: z.enum(["true", "false"]).optional(),
  sort: z.enum(["name", "availableBeds", "occupancy", "capacity"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type ShelterQuery = z.infer<typeof shelterQuerySchema>;

export const createShelterSchema = z.object({
  name: z.string().trim().min(3, "Shelter name is required").max(160),
  address: z.string().trim().min(3, "Address is required").max(300),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(1_000_000),
  currentOccupancy: z.coerce.number().int().min(0).default(0),
  facilities: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  managerContact: z.string().trim().max(80).nullish(),
  status: z.nativeEnum(ShelterStatus).default("OPEN"),
});

export type CreateShelterInput = z.infer<typeof createShelterSchema>;

export const updateShelterSchema = createShelterSchema.partial().omit({ currentOccupancy: true });

export const occupancySchema = z.object({
  currentOccupancy: z.coerce.number().int().min(0, "Occupancy cannot be negative").max(1_000_000),
  status: z.nativeEnum(ShelterStatus).optional(),
});
