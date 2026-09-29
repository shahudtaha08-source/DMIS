import { z } from "zod";

/** The Explorer's own filter contract (docs/API_DESIGN.md §/historical-disasters).
 *  Deliberately small: a full-text/faceted search engine is not the point of
 *  this module, a fast AND-combined predicate set over 783 rows is. */
export const historicalQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  type: z.string().trim().max(80).optional(),
  subtype: z.string().trim().max(80).optional(),
  group: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  yearFrom: z.coerce.number().int().min(1000).max(3000).optional(),
  yearTo: z.coerce.number().int().min(1000).max(3000).optional(),
  minDeaths: z.coerce.number().int().min(0).optional(),
  minAffected: z.coerce.number().int().min(0).optional(),
  hasCoordinates: z.enum(["true", "false"]).optional(),
  sort: z.enum(["startYear", "totalAffected", "totalDeaths", "disNo", "disasterType"]).default("startYear"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type HistoricalQuery = z.infer<typeof historicalQuerySchema>;
