/**
 * Data-access layer for the Dashboard module (docs/ARCHITECTURE.md
 * per-module contract). Each method is queried independently by the
 * service layer and wrapped in its own try/catch there, so one failing
 * metric (e.g. a table not yet migrated) degrades that tile instead of
 * failing the whole dashboard (plan §6: "If Analytics API fails, Dashboard
 * must still work" — applied here at sub-metric granularity too).
 */
import type { IncidentStatus } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";

export interface IncidentStatusCount {
  status: IncidentStatus;
  count: number;
}
export interface DecadeCount {
  decade: number;
  count: number;
}

export interface DashboardRepository {
  countActiveIncidents(): Promise<number>;
  countCriticalActiveIncidents(): Promise<number>;
  sumActiveAffectedPopulation(): Promise<number>;
  countHistoricalDisasters(): Promise<number>;
  countActiveTeams(): Promise<number>;
  shelterCapacity(): Promise<{ capacity: number; occupancy: number; sheltersOpen: number }>;
  resourceStockCounts(): Promise<{ lowStock: number; outOfStock: number; total: number }>;
  incidentsByStatus(): Promise<IncidentStatusCount[]>;
  historicalByDecade(): Promise<DecadeCount[]>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Service temporarily unavailable. Please try again shortly.", "dashboard");
  }
  return prisma;
}

const ACTIVE_INCIDENT_STATUSES = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED"];

export class PrismaDashboardRepository implements DashboardRepository {
  async countActiveIncidents() {
    return db().incident.count({ where: { status: { in: ACTIVE_INCIDENT_STATUSES } } });
  }

  async countCriticalActiveIncidents() {
    return db().incident.count({ where: { status: { in: ACTIVE_INCIDENT_STATUSES }, severity: "CRITICAL" } });
  }

  async sumActiveAffectedPopulation() {
    const r = await db().incident.aggregate({
      where: { status: { in: ACTIVE_INCIDENT_STATUSES } },
      _sum: { affectedPopulationEstimate: true },
    });
    return r._sum.affectedPopulationEstimate ?? 0;
  }

  async countHistoricalDisasters() {
    return db().historicalDisaster.count();
  }

  async countActiveTeams() {
    return db().rescueTeam.count({ where: { status: { in: ["AVAILABLE", "DEPLOYED"] } } });
  }

  async shelterCapacity() {
    const [agg, sheltersOpen] = await Promise.all([
      db().shelter.aggregate({ _sum: { capacity: true, currentOccupancy: true } }),
      db().shelter.count({ where: { status: "OPEN" } }),
    ]);
    return { capacity: agg._sum.capacity ?? 0, occupancy: agg._sum.currentOccupancy ?? 0, sheltersOpen };
  }

  async resourceStockCounts() {
    const [lowStock, outOfStock, total] = await Promise.all([
      db().resource.count({ where: { status: "LOW_STOCK" } }),
      db().resource.count({ where: { status: "OUT_OF_STOCK" } }),
      db().resource.count(),
    ]);
    return { lowStock, outOfStock, total };
  }

  async incidentsByStatus() {
    const rows = await db().incident.groupBy({ by: ["status"], _count: { _all: true } });
    return rows.map((r: { status: string; _count: { _all: number } }) => ({ status: r.status as IncidentStatus, count: r._count._all }));
  }

  /** Buckets HistoricalDisaster.startYear into decades in application code — one lightweight groupBy, not a raw query. */
  async historicalByDecade() {
    const rows = await db().historicalDisaster.groupBy({ by: ["startYear"], _count: { _all: true } });
    const byDecade = new Map<number, number>();
    for (const r of rows as { startYear: number; _count: { _all: number } }[]) {
      const decade = Math.floor(r.startYear / 10) * 10;
      byDecade.set(decade, (byDecade.get(decade) ?? 0) + r._count._all);
    }
    return [...byDecade.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count }));
  }
}

let current: DashboardRepository | null = null;
export function getDashboardRepository(): DashboardRepository {
  return (current ??= new PrismaDashboardRepository());
}
export function setDashboardRepository(repo: DashboardRepository | null) {
  current = repo;
}
