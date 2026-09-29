import type { GeoPointDTO, HistoricalDisasterDetailDTO, HistoricalFilterOptionsDTO, HistoricalStatsDTO, PaginationMeta } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { logger } from "../../lib/logger";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { getHistoricalRepository, type HistoricalPage } from "./repository";
import type { HistoricalQuery } from "./validation";

const MODULE = "historical";

export async function listHistoricalDisasters(query: HistoricalQuery): Promise<{ items: HistoricalPage["items"]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getHistoricalRepository().search({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

export async function getHistoricalDisaster(idOrDisNo: string): Promise<HistoricalDisasterDetailDTO> {
  const record = await getHistoricalRepository().findById(idOrDisNo);
  if (!record) throw AppError.notFound("No historical disaster matches that reference.", MODULE);
  return record;
}

export async function getFilterOptions(): Promise<HistoricalFilterOptionsDTO> {
  const o = await getHistoricalRepository().filterOptions();
  return { ...o, total: o.total, yearMin: o.yearMin, yearMax: o.yearMax, withCoordinates: o.withCoordinates };
}

export async function getGeoPoints(limit = 500): Promise<GeoPointDTO[]> {
  return getHistoricalRepository().geoPoints(Math.min(2000, Math.max(1, limit)));
}

/**
 * Aggregates for the Analytics page and the Historical Explorer's summary
 * strip. Each metric degrades independently: a failing query yields `null`
 * (or `[]`) and is named in `unavailable` rather than failing the request —
 * Analytics must never take down anything else (docs/ARCHITECTURE.md §3).
 */
export async function getHistoricalStats(): Promise<HistoricalStatsDTO> {
  const repo = getHistoricalRepository();
  const unavailable: string[] = [];

  async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      logger.warn({ err: (err as Error).message, metric: name }, "Historical stat unavailable");
      unavailable.push(name);
      return fallback;
    }
  }

  const [total, byType, byDecade, byRegion, affected, deaths] = await Promise.all([
    safe<number | null>("total", () => repo.totalCount(), null),
    safe("byType", () => repo.byType(12), [] as { type: string; count: number }[]),
    safe("byDecade", () => repo.byDecade(), [] as { decade: number; count: number }[]),
    safe("byRegion", () => repo.byRegion(10), [] as { region: string; count: number }[]),
    safe<number | null>("totalAffected", () => repo.sumAffected(), null),
    safe<number | null>("totalDeaths", () => repo.sumDeaths(), null),
  ]);

  return { total, byType, byDecade, byRegion, totalAffected: affected, totalDeaths: deaths, unavailable };
}
