import { z } from "zod";
import { AlertSeverity, IncidentStatus, Severity } from "@dmis/shared";

const coordinate = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

export const incidentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as IncidentStatus[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(IncidentStatus).includes(s)), "Unknown incident status"),
  severity: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as Severity[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(Severity).includes(s)), "Unknown severity"),
  type: z.string().trim().max(80).optional(),
  active: z.enum(["true", "false"]).optional(),
  sort: z.enum(["createdAt", "severity", "status", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type IncidentQuery = z.infer<typeof incidentQuerySchema>;

export const createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  disasterType: z.string().trim().min(2, "Disaster type is required").max(80),
  location: z.string().trim().min(2, "Location is required").max(160),
  description: z.string().trim().min(5, "Add a short description").max(4000),
  severity: z.nativeEnum(Severity),
  affectedPopulationEstimate: z.coerce.number().int().min(0).max(1_000_000_000).nullish(),
  latitude: coordinate.nullish(),
  longitude: longitude.nullish(),
  alertSeverity: z.nativeEnum(AlertSeverity).optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const updateIncidentSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  disasterType: z.string().trim().min(2).max(80).optional(),
  location: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(5).max(4000).optional(),
  severity: z.nativeEnum(Severity).optional(),
  affectedPopulationEstimate: z.coerce.number().int().min(0).max(1_000_000_000).nullish(),
  latitude: coordinate.nullish(),
  longitude: longitude.nullish(),
});

export const incidentStatusSchema = z.object({
  status: z.nativeEnum(IncidentStatus),
  note: z.string().trim().max(500).optional(),
});

export const assignTeamSchema = z.object({
  teamId: z.string().trim().min(1, "Choose a team").nullable(),
  note: z.string().trim().max(500).optional(),
});
