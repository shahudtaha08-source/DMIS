import type { DashboardRepository, DecadeCount, IncidentStatusCount } from "../modules/dashboard/repository";

/** Test double for DashboardRepository — every method configurable, some can be made to throw. */
export class InMemoryDashboardRepository implements DashboardRepository {
  activeIncidents = 0;
  criticalIncidents = 0;
  affectedPopulation = 0;
  historicalCount = 0;
  activeTeamsCount = 0;
  shelters = { capacity: 0, occupancy: 0, sheltersOpen: 0 };
  resources = { lowStock: 0, outOfStock: 0, total: 0 };
  statusBreakdown: IncidentStatusCount[] = [];
  decadeBreakdown: DecadeCount[] = [];
  failing = new Set<string>();

  private guard<T>(name: string, value: T): Promise<T> {
    if (this.failing.has(name)) return Promise.reject(new Error(`simulated failure: ${name}`));
    return Promise.resolve(value);
  }

  countActiveIncidents = () => this.guard("activeIncidents", this.activeIncidents);
  countCriticalActiveIncidents = () => this.guard("criticalIncidents", this.criticalIncidents);
  sumActiveAffectedPopulation = () => this.guard("affectedPopulationEstimate", this.affectedPopulation);
  countHistoricalDisasters = () => this.guard("historicalDisasterCount", this.historicalCount);
  countActiveTeams = () => this.guard("activeTeams", this.activeTeamsCount);
  shelterCapacity = () => this.guard("shelters", this.shelters);
  resourceStockCounts = () => this.guard("resources", this.resources);
  incidentsByStatus = () => this.guard("incidentsByStatus", this.statusBreakdown);
  historicalByDecade = () => this.guard("historicalByDecade", this.decadeBreakdown);
}
