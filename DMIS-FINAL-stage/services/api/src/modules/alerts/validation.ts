import { z } from "zod";
import { AlertSeverity, AlertStatus } from "@dmis/shared";

export const alertQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as AlertStatus[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(AlertStatus).includes(s)), "Unknown alert status"),
  severity: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as AlertSeverity[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(AlertSeverity).includes(s)), "Unknown alert severity"),
  /** Only PUBLISHED alerts whose validity window has not closed. */
  active: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export type AlertQuery = z.infer<typeof alertQuerySchema>;

export const createAlertSchema = z.object({
  title: z.string().trim().min(4, "Alert title is required").max(160),
  message: z.string().trim().min(10, "Describe the alert").max(2000),
  severity: z.nativeEnum(AlertSeverity),
  affectedArea: z.string().trim().min(2, "Affected area is required").max(160),
  relatedIncidentId: z.string().trim().max(60).nullish(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  publish: z.boolean().optional().default(false),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export const updateAlertSchema = z.object({
  title: z.string().trim().min(4).max(160).optional(),
  message: z.string().trim().min(10).max(2000).optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  affectedArea: z.string().trim().min(2).max(160).optional(),
  relatedIncidentId: z.string().trim().max(60).nullish(),
  validUntil: z.coerce.date().optional(),
});
