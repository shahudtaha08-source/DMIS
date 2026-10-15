import type { DashboardSummaryDTO } from "@dmis/shared";
import { logger } from "../../lib/logger";
import { getDashboardRepository, type DecadeCount, type IncidentStatusCount } from "./repository";

/**
 * Each metric is fetched independently. A failing metric is reported as
 * `null` (or an empty array for the two chart datasets) and its name is
 * added to `unavailable`, rather than failing the whole response — so a
 * problem with, say, the Resources table never takes down incident counts
 * the way a single Analytics failure must not take down the Dashboard
 * (plan §6/§42).
 */
export async function getDashboardSummary(): Promise<DashboardSummaryDTO> {
  const repo = getDashboardRepository();
  const unavailable: string[] = [];

  async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      logger.warn({ err: (err as Error).message, metric: name }, "Dashboard metric unavailable");
      unavailable.push(name);
      return fallback;
    }
  }

  const [
    activeIncidents,
    criticalIncidents,
    affectedPopulationEstimate,
    historicalDisasterCount,
    activeTeams,
    shelters,
    resources,
    incidentsByStatus,
    historicalByDecade,
  ] = await Promise.all([
    safe("activeIncidents", () => repo.countActiveIncidents(), null),
    safe("criticalIncidents", () => repo.countCriticalActiveIncidents(), null),
    safe("affectedPopulationEstimate", () => repo.sumActiveAffectedPopulation(), null),
    safe("historicalDisasterCount", () => repo.countHistoricalDisasters(), null),
    safe("activeTeams", () => repo.countActiveTeams(), null),
    safe("shelters", () => repo.shelterCapacity(), null),
    safe("resources", () => repo.resourceStockCounts(), null),
    safe<IncidentStatusCount[]>("incidentsByStatus", () => repo.incidentsByStatus(), []),
    safe<DecadeCount[]>("historicalByDecade", () => repo.historicalByDecade(), []),
  ]);

  return {
    activeIncidents,
    criticalIncidents,
    affectedPopulationEstimate,
    historicalDisasterCount,
    activeTeams,
    shelterCapacityTotal: shelters?.capacity ?? null,
    shelterOccupancyTotal: shelters?.occupancy ?? null,
    sheltersOpen: shelters?.sheltersOpen ?? null,
    resourcesLowStock: resources?.lowStock ?? null,
    resourcesOutOfStock: resources?.outOfStock ?? null,
    resourcesTotal: resources?.total ?? null,
    incidentsByStatus,
    historicalByDecade,
    unavailable,
    generatedAt: new Date().toISOString(),
  };
}
