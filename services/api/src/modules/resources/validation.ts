import { z } from "zod";
import { ResourceStatus, ResourceTransactionType } from "@dmis/shared";

export const resourceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.split(",") as ResourceStatus[]) : undefined))
    .refine((v) => !v || v.every((s) => Object.values(ResourceStatus).includes(s)), "Unknown resource status"),
  lowStockOnly: z.enum(["true", "false"]).optional(),
  sort: z.enum(["name", "quantityAvailable", "category", "status"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type ResourceQuery = z.infer<typeof resourceQuerySchema>;

export const createResourceSchema = z.object({
  name: z.string().trim().min(2, "Item name is required").max(120),
  category: z.string().trim().min(2, "Category is required").max(60),
  unit: z.string().trim().min(1, "Unit is required").max(24),
  quantityAvailable: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(0),
  locationId: z.string().trim().max(60).nullish(),
  status: z.nativeEnum(ResourceStatus).default("AVAILABLE"),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = createResourceSchema.partial().omit({ quantityAvailable: true });

/** Stock is only ever moved through the ledger (Chunk 12): quantityAvailable
 *  is derived from it, never set directly by a client. */
export const transactionSchema = z.object({
  type: z.nativeEnum(ResourceTransactionType),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  relatedIncidentId: z.string().trim().max(60).nullish(),
  note: z.string().trim().max(200).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
