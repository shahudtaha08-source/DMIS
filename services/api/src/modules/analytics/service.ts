/**
 * Analytics (Chunk 15). Every metric is fetched independently and degrades to
 * `null`/`[]` + an entry in `unavailable` — an Analytics failure must never
 * take down the Dashboard or any other module.
 *
 * Historical figures reuse the Historical module's aggregations; operational
 * figures query the live tables directly. The two are never mixed into a
 * single "total disasters" number, because they mean different things.
 */
import { AnalyticsOverviewDTO, Severity } from "@dmis/shared";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import { logger } from "../../lib/logger";
import { getHistoricalRepository } from "../historical/repository";

const ACTIVE = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED"];

export async function getAnalyticsOverview(): Promise<AnalyticsOverviewDTO> {
  const unavailable: string[] = [];

  async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      if (!isDatabaseAvailable()) throw new Error("database unavailable");
      return await fn();
    } catch (err) {
      logger.warn({ err: (err as Error).message, metric: name }, "Analytics metric unavailable");
      unavailable.push(name);
      return fallback;
    }
  }

  const p = () => prisma as any;
  const historical = getHistoricalRepository();

  const [
    totalHistoricalDisasters,
    totalIncidents,
    activeIncidents,
    incidentsBySeverity,
    incidentsByStatus,
    incidentsByType,
    affectedPopulation,
    totalDeaths,
    shelterAgg,
    resources,
    historicalByType,
    historicalByDecade,
  ] = await Promise.all([
    safe<number | null>("totalHistoricalDisasters", () => historical.totalCount(), null),
    safe<number | null>("totalIncidents", () => p().incident.count(), null),
    safe<number | null>("activeIncidents", () => p().incident.count({ where: { status: { in: ACTIVE } } }), null),
    safe<{ severity: Severity; count: number }[]>("incidentsBySeverity", async () => {
      const rows = (await p().incident.groupBy({ by: ["severity"], _count: { _all: true } })) as any[];
      const order: Severity[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
      return order
        .map((severity) => ({ severity, count: rows.find((r) => r.severity === severity)?._count._all ?? 0 }))
        .filter((r) => r.count > 0);
    }, []),
    safe("incidentsByStatus", () => statusCounts(p()), []),
    safe<{ type: string; count: number }[]>("incidentsByType", async () => {
      const rows = (await p().incident.groupBy({ by: ["disasterType"], _count: { _all: true }, orderBy: { _count: { disasterType: "desc" } }, take: 10 })) as any[];
      return rows.map((r) => ({ type: r.disasterType, count: r._count._all }));
    }, []),
    safe<number | null>("affectedPopulation", async () => {
      const agg = (await p().incident.aggregate({ _sum: { affectedPopulationEstimate: true } })) as any;
      return agg._sum.affectedPopulationEstimate ?? 0;
    }, null),
    safe<number | null>("totalDeaths", () => historical.sumDeaths(), null),
    safe<{ capacity: number; occupancy: number } | null>("shelterUtilization", async () => {
      const agg = (await p().shelter.aggregate({ _sum: { capacity: true, currentOccupancy: true } })) as any;
      return { capacity: agg._sum.capacity ?? 0, occupancy: agg._sum.currentOccupancy ?? 0 };
    }, null),
    safe<AnalyticsOverviewDTO["resourceAvailability"]>("resourceAvailability", async () => {
      const [total, available, lowStock, outOfStock] = await Promise.all([
        p().resource.count(),
        p().resource.count({ where: { status: "AVAILABLE" } }),
        p().resource.count({ where: { status: "LOW_STOCK" } }),
        p().resource.count({ where: { status: "OUT_OF_STOCK" } }),
      ]);
      return { total, available, lowStock, outOfStock };
    }, null),
    safe<{ type: string; count: number }[]>("historicalByType", () => historical.byType(10), []),
    safe("historicalByDecade", () => historical.byDecade(), [] as { decade: number; count: number }[]),
  ]);

  const shelterUtilizationPercent =
    shelterAgg && shelterAgg.capacity > 0 ? Math.round((shelterAgg.occupancy / shelterAgg.capacity) * 100) : null;

  return {
    totalHistoricalDisasters,
    totalIncidents,
    activeIncidents,
    incidentsBySeverity,
    incidentsByStatus,
    incidentsByType,
    affectedPopulation,
    totalDeaths,
    shelterCapacity: shelterAgg?.capacity ?? null,
    shelterOccupancy: shelterAgg?.occupancy ?? null,
    shelterUtilizationPercent,
    resourceAvailability: resources,
    historicalByType,
    historicalByDecade,
    unavailable,
    generatedAt: new Date().toISOString(),
  };
}

async function statusCounts(p: () => any) {
  const rows = (await p().incident.groupBy({ by: ["status"], _count: { _all: true } })) as any[];
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}
