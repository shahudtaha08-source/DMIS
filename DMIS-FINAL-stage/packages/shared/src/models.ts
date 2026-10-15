/**
 * Shared shapes for API payloads. These mirror docs/DATABASE_DESIGN.md and
 * will mirror the generated Prisma types once Chunk 2 lands — kept here as
 * plain interfaces (not Prisma-generated) so apps/web and apps/mobile
 * never depend on the Prisma client directly.
 */
import type {
  AlertSeverity,
  AlertStatus,
  IncidentStatus,
  ResourceStatus,
  ResourceTransactionType,
  Severity,
  ShelterStatus,
  TeamStatus,
  UserRole,
  VictimStatus,
  VolunteerStatus,
} from "./enums";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Field names mirror the source CSV columns 1:1 in docs/DATASET_ANALYSIS.md. */
export interface HistoricalDisasterDTO {
  id: string;
  disNo: string;
  historic: boolean;
  classificationKey: string;
  disasterGroup: string;
  disasterSubgroup: string;
  disasterType: string;
  disasterSubtype: string | null;
  eventName: string | null;
  location: string | null;
  origin: string | null;
  magnitude: number | null;
  magnitudeScale: string | null;
  latitude: number | null;
  longitude: number | null;
  startYear: number;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  totalDeaths: number | null;
  noInjured: number | null;
  noAffected: number | null;
  noHomeless: number | null;
  totalAffected: number | null;
  totalDamageUsd000: number | null;
  adminUnitsRaw: unknown | null;
}

// ── Operations (Chunks 7–13) ──────────────────────────────────────────────

/** Row shape for the Historical Explorer table. A trimmed projection of the
 *  full record so a 50-row page stays small; `/historical-disasters/:id`
 *  returns the complete record. */
export interface HistoricalDisasterListItemDTO {
  id: string;
  disNo: string;
  eventName: string | null;
  disasterGroup: string;
  disasterType: string;
  disasterSubtype: string | null;
  location: string | null;
  startYear: number;
  totalAffected: number | null;
  totalDeaths: number | null;
  hasCoordinates: boolean;
}

export interface HistoricalDisasterDetailDTO extends HistoricalDisasterDTO {
  iso: string;
  country: string;
  subregion: string;
  region: string;
  origin: string | null;
  riverBasin: string | null;
  appeal: boolean;
  declaration: boolean;
  ofdaBhaResponse: boolean;
  aidContributionUsd000: number | null;
  reconstructionCostsUsd000: number | null;
  totalDamageUsd000: number | null;
  totalDamageAdjUsd000: number | null;
  insuredDamageUsd000: number | null;
  cpi: number | null;
  associatedTypes: string | null;
  entryDate: string | null;
  lastUpdate: string | null;
  createdAt: string;
}

/** Distinct filter values + their record counts, so the Explorer never has to
 *  hard-code or guess the vocabulary of the dataset. */
export interface HistoricalFilterOptionsDTO {
  types: { value: string; count: number }[];
  subtypes: { value: string; count: number }[];
  locations: { value: string; count: number }[];
  groups: { value: string; count: number }[];
  yearMin: number | null;
  yearMax: number | null;
  total: number | null;
  withCoordinates: number | null;
}

export interface HistoricalStatsDTO {
  total: number | null;
  byType: { type: string; count: number }[];
  byDecade: HistoricalDecadeCountDTO[];
  totalAffected: number | null;
  totalDeaths: number | null;
  byRegion: { region: string; count: number }[];
  unavailable: string[];
}

/** Lightweight lat/lon-only payload for map layers. Records without
 *  coordinates in the source CSV are simply absent — never fabricated. */
export interface GeoPointDTO {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  year: number;
  totalAffected: number | null;
}

export interface IncidentDTO {
  id: string;
  title: string;
  description: string;
  disasterType: string;
  severity: Severity;
  status: IncidentStatus;
  latitude: number | null;
  longitude: number | null;
  location: string;
  affectedPopulationEstimate: number | null;
  reportedById: string;
  assignedTeamId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AlertDTO {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  affectedArea: string;
  validFrom: string;
  validUntil: string;
  relatedIncidentId: string | null;
  createdById: string;
  createdAt: string;
}

export interface ShelterDTO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: ShelterStatus;
  managerContact: string | null;
}

export interface ResourceDTO {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  status: ResourceStatus;
  locationId: string | null;
}

export interface ResourceTransactionDTO {
  id: string;
  resourceId: string;
  type: ResourceTransactionType;
  quantity: number;
  relatedIncidentId: string | null;
  performedById: string;
  createdAt: string;
}

export interface RescueTeamDTO {
  id: string;
  name: string;
  specialization: string;
  status: TeamStatus;
  currentIncidentId: string | null;
  baseLocation: string | null;
}

export interface VolunteerDTO {
  id: string;
  userId: string | null;
  name: string;
  phone: string;
  skills: string[];
  status: VolunteerStatus;
  teamId: string | null;
}

export interface VictimDTO {
  id: string;
  incidentId: string | null;
  name: string | null;
  age: number | null;
  gender: string | null;
  status: VictimStatus;
  location: string | null;
  contactInfo: string | null;
  reportedById: string;
  notes: string | null;
}

export interface EmergencyContactDTO {
  id: string;
  name: string;
  role: string;
  phone: string;
  region: string;
  category: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  body: string;
  relatedAlertId: string | null;
  relatedIncidentId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown | null;
  createdAt: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  token: string;
  user: UserDTO;
}

export interface IncidentStatusCountDTO {
  status: IncidentStatus;
  count: number;
}

export interface HistoricalDecadeCountDTO {
  decade: number;
  count: number;
}

/**
 * Every numeric field is nullable: `null` means that metric's query failed
 * and is listed in `unavailable`, not that the true value is zero. The
 * chart arrays are `[]` in the same situation. See docs/ARCHITECTURE.md §3
 * and the Dashboard module (Chunk 6).
 */
export interface DashboardSummaryDTO {
  activeIncidents: number | null;
  criticalIncidents: number | null;
  affectedPopulationEstimate: number | null;
  historicalDisasterCount: number | null;
  activeTeams: number | null;
  shelterCapacityTotal: number | null;
  shelterOccupancyTotal: number | null;
  sheltersOpen: number | null;
  resourcesLowStock: number | null;
  resourcesOutOfStock: number | null;
  resourcesTotal: number | null;
  incidentsByStatus: IncidentStatusCountDTO[];
  historicalByDecade: HistoricalDecadeCountDTO[];
  unavailable: string[];
  generatedAt: string;
}

// ── Operational DTOs (Incident / Alert / Shelter / Resource / Team) ───────

/** List projections carry denormalised display names so the UI never has to
 *  issue a second request per row (and a single query does the join). */
export interface IncidentListItemDTO {
  id: string;
  title: string;
  disasterType: string;
  severity: Severity;
  status: IncidentStatus;
  location: string;
  latitude: number | null;
  longitude: number | null;
  affectedPopulationEstimate: number | null;
  reportedByName: string;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface IncidentTimelineEventDTO {
  id: string;
  at: string;
  kind: "created" | "status" | "assigned" | "updated";
  label: string;
  detail: string | null;
  actor: string | null;
}

export interface IncidentDetailDTO extends IncidentListItemDTO {
  description: string;
  reportedById: string;
  alertCount: number;
  timeline: IncidentTimelineEventDTO[];
}

export interface AlertListItemDTO extends AlertDTO {
  createdByName: string;
  relatedIncidentTitle: string | null;
}

export interface ShelterListItemDTO {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  /** Server-computed so every client agrees: capacity - occupancy, floored at 0. */
  availableBeds: number;
  occupancyPercent: number;
  facilities: string[];
  status: ShelterStatus;
  managerContact: string | null;
  updatedAt: string;
}

export interface ResourceListItemDTO {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityAvailable: number;
  /** Net (allocations - returns) drawn from the transaction ledger. */
  allocated: number;
  lowStockThreshold: number;
  status: ResourceStatus;
  isLowStock: boolean;
  locationId: string | null;
  locationName: string | null;
  updatedAt: string;
}

export interface RescueTeamListItemDTO {
  id: string;
  name: string;
  specialization: string;
  status: TeamStatus;
  baseLocation: string | null;
  activeIncidents: number;
  currentIncidentId: string | null;
  currentIncidentTitle: string | null;
  updatedAt: string;
}

/** One map request, four independently-fetched layers. A layer that fails is
 *  reported in `unavailable` with an empty array — the map still renders. */
export interface MapLayersDTO {
  incidents: MapIncidentDTO[];
  shelters: MapShelterDTO[];
  teams: MapTeamDTO[];
  historical: GeoPointDTO[];
  unavailable: string[];
  generatedAt: string;
}

export interface MapIncidentDTO {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  location: string;
}

export interface MapShelterDTO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  availableBeds: number;
  status: ShelterStatus;
}

export interface MapTeamDTO {
  id: string;
  name: string;
  status: TeamStatus;
  latitude: number | null;
  longitude: number | null;
  baseLocation: string | null;
}

export interface AnalyticsOverviewDTO {
  totalHistoricalDisasters: number | null;
  totalIncidents: number | null;
  activeIncidents: number | null;
  incidentsBySeverity: { severity: Severity; count: number }[];
  incidentsByStatus: IncidentStatusCountDTO[];
  incidentsByType: { type: string; count: number }[];
  affectedPopulation: number | null;
  totalDeaths: number | null;
  shelterCapacity: number | null;
  shelterOccupancy: number | null;
  shelterUtilizationPercent: number | null;
  resourceAvailability: { total: number; available: number; lowStock: number; outOfStock: number } | null;
  historicalByType: { type: string; count: number }[];
  historicalByDecade: HistoricalDecadeCountDTO[];
  unavailable: string[];
  generatedAt: string;
}
