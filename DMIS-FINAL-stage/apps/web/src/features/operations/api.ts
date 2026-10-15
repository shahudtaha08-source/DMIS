import type {
  AlertListItemDTO,
  AlertSeverity,
  AlertStatus,
  AnalyticsOverviewDTO,
  GeoPointDTO,
  HistoricalDisasterDetailDTO,
  HistoricalDisasterListItemDTO,
  HistoricalFilterOptionsDTO,
  HistoricalStatsDTO,
  IncidentDetailDTO,
  IncidentListItemDTO,
  IncidentStatus,
  MapLayersDTO,
  PaginationMeta,
  RescueTeamListItemDTO,
  ResourceListItemDTO,
  ResourceTransactionDTO,
  ShelterListItemDTO,
  ShelterStatus,
  Severity,
} from "@dmis/shared";
import { apiRequest } from "../../lib/api";

/** Typed API clients for every operational module. One file per feature —
 *  pages never call `apiRequest` directly (docs/ARCHITECTURE.md). */

function qs(params: object): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export interface Paged<T> {
  items: T[];
  total: number;
}

// ── Historical Disaster Explorer ───────────────────────────────────────────

export interface HistoricalFilters {
  q?: string;
  type?: string;
  subtype?: string;
  group?: string;
  location?: string;
  yearFrom?: number;
  yearTo?: number;
  minDeaths?: number;
  minAffected?: number;
  hasCoordinates?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchHistoricalDisasters(
  filters: HistoricalFilters,
  signal: AbortSignal
): Promise<Paged<HistoricalDisasterListItemDTO>> {
  const { data, meta } = await apiRequest<HistoricalDisasterListItemDTO[]>("/historical-disasters" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export async function fetchHistoricalRecord(id: string, signal: AbortSignal) {
  const { data } = await apiRequest<HistoricalDisasterDetailDTO>(`/historical-disasters/${encodeURIComponent(id)}`, { signal });
  return data;
}

export async function fetchHistoricalFilterOptions(signal: AbortSignal) {
  const { data } = await apiRequest<HistoricalFilterOptionsDTO>("/historical-disasters/filters", { signal });
  return data;
}

export async function fetchHistoricalStats(signal: AbortSignal) {
  const { data } = await apiRequest<HistoricalStatsDTO>("/historical-disasters/stats", { signal });
  return data;
}

// ── Incidents ─────────────────────────────────────────────────────────────

export interface IncidentFilters {
  q?: string;
  status?: string;
  severity?: string;
  type?: string;
  active?: "true" | "false";
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchIncidents(filters: IncidentFilters, signal: AbortSignal): Promise<Paged<IncidentListItemDTO>> {
  const { data, meta } = await apiRequest<IncidentListItemDTO[]>("/incidents" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export async function fetchIncident(id: string, signal: AbortSignal) {
  const { data } = await apiRequest<IncidentDetailDTO>(`/incidents/${id}`, { signal });
  return data;
}

export interface IncidentInput {
  title?: string;
  disasterType: string;
  location: string;
  description: string;
  severity: Severity;
  affectedPopulationEstimate?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  alertSeverity?: AlertSeverity;
}

export async function createIncident(input: IncidentInput) {
  const { data } = await apiRequest<IncidentDetailDTO>("/incidents", { method: "POST", body: input });
  return data;
}

export async function updateIncident(id: string, patch: Partial<IncidentInput>) {
  const { data } = await apiRequest<IncidentDetailDTO>(`/incidents/${id}`, { method: "PATCH", body: patch });
  return data;
}

export async function updateIncidentStatus(id: string, status: IncidentStatus, note?: string) {
  const { data } = await apiRequest<IncidentDetailDTO>(`/incidents/${id}/status`, {
    method: "PATCH",
    body: { status, note },
  });
  return data;
}

export async function assignIncidentTeam(id: string, teamId: string | null) {
  const { data } = await apiRequest<IncidentDetailDTO>(`/incidents/${id}/assign-team`, { method: "PATCH", body: { teamId } });
  return data;
}

// ── Alerts ────────────────────────────────────────────────────────────────

export async function fetchAlerts(
  filters: { q?: string; status?: string; severity?: string; active?: "true" | "false"; page?: number; pageSize?: number },
  signal: AbortSignal
): Promise<Paged<AlertListItemDTO>> {
  const { data, meta } = await apiRequest<AlertListItemDTO[]>("/alerts" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export async function fetchActiveAlerts(limit = 10, signal?: AbortSignal) {
  const { data } = await apiRequest<AlertListItemDTO[]>(`/alerts/active?limit=${limit}`, { signal });
  return data;
}

export interface AlertInput {
  title: string;
  message: string;
  severity: AlertSeverity;
  affectedArea: string;
  relatedIncidentId?: string | null;
  validUntil?: string | null;
  publish?: boolean;
}

export async function createAlert(input: AlertInput) {
  const { data } = await apiRequest<AlertListItemDTO>("/alerts", { method: "POST", body: input });
  return data;
}

export async function publishAlert(id: string) {
  const { data } = await apiRequest<AlertListItemDTO>(`/alerts/${id}/publish`, { method: "PATCH" });
  return data;
}

export async function deactivateAlert(id: string) {
  const { data } = await apiRequest<AlertListItemDTO>(`/alerts/${id}/deactivate`, { method: "PATCH" });
  return data;
}

// ── Shelters ──────────────────────────────────────────────────────────────

export async function fetchShelters(
  filters: { q?: string; status?: string; hasSpace?: "true" | "false"; sort?: string; order?: "asc" | "desc"; page?: number; pageSize?: number },
  signal: AbortSignal
): Promise<Paged<ShelterListItemDTO>> {
  const { data, meta } = await apiRequest<ShelterListItemDTO[]>("/shelters" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export interface ShelterInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy?: number;
  facilities?: string[];
  managerContact?: string | null;
  status?: ShelterStatus;
}

export async function createShelter(input: ShelterInput) {
  const { data } = await apiRequest<ShelterListItemDTO>("/shelters", { method: "POST", body: input });
  return data;
}

export async function updateShelterOccupancy(id: string, currentOccupancy: number) {
  const { data } = await apiRequest<ShelterListItemDTO>(`/shelters/${id}/occupancy`, {
    method: "PATCH",
    body: { currentOccupancy },
  });
  return data;
}

// ── Resources ─────────────────────────────────────────────────────────────

export async function fetchResources(
  filters: { q?: string; category?: string; status?: string; lowStockOnly?: "true" | "false"; sort?: string; order?: "asc" | "desc"; page?: number; pageSize?: number },
  signal: AbortSignal
): Promise<Paged<ResourceListItemDTO>> {
  const { data, meta } = await apiRequest<ResourceListItemDTO[]>("/resources" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export interface ResourceInput {
  name: string;
  category: string;
  unit: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  locationId?: string | null;
}

export async function createResource(input: ResourceInput) {
  const { data } = await apiRequest<ResourceListItemDTO>("/resources", { method: "POST", body: input });
  return data;
}

export async function postResourceTransaction(
  id: string,
  txn: { type: "RESTOCK" | "ALLOCATION" | "RETURN"; quantity: number; relatedIncidentId?: string | null }
) {
  const { data } = await apiRequest<{ resource: ResourceListItemDTO; transaction: ResourceTransactionDTO }>(
    `/resources/${id}/transactions`,
    { method: "POST", body: txn }
  );
  return data;
}

// ── Rescue teams ──────────────────────────────────────────────────────────

export async function fetchTeams(
  filters: { q?: string; status?: string; page?: number; pageSize?: number },
  signal: AbortSignal
): Promise<Paged<RescueTeamListItemDTO>> {
  const { data, meta } = await apiRequest<RescueTeamListItemDTO[]>("/teams" + qs(filters), { signal });
  return { items: data, total: meta?.total ?? data.length };
}

export async function setTeamStatus(id: string, status: "AVAILABLE" | "DEPLOYED" | "OFF_DUTY") {
  const { data } = await apiRequest<RescueTeamListItemDTO>(`/teams/${id}/status`, { method: "PATCH", body: { status } });
  return data;
}

// ── Map + Analytics ───────────────────────────────────────────────────────

export async function fetchMapLayers(signal: AbortSignal) {
  const { data } = await apiRequest<MapLayersDTO>("/map/layers", { signal });
  return data;
}

export async function fetchAnalyticsOverview(signal: AbortSignal) {
  const { data } = await apiRequest<AnalyticsOverviewDTO>("/analytics/overview", { signal });
  return data;
}

export type { AlertStatus, GeoPointDTO, IncidentListItemDTO, PaginationMeta, ShelterListItemDTO };
