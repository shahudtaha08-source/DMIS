import { AlertSeverity, INCIDENT_STATUS_TRANSITIONS, IncidentStatus, type IncidentDetailDTO, type IncidentListItemDTO, type PaginationMeta } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { recordAudit } from "../../lib/audit";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { createAlert } from "../alerts/service";
import { getTeamRepository } from "../teams/repository";
import { getIncidentRepository } from "./repository";
import type { CreateIncidentInput, IncidentQuery } from "./validation";

const MODULE = "incidents";

/**
 * Lifecycle ordering. An incident may only move *forward* through
 * REPORTED → VERIFIED → RESPONSE_ACTIVE → STABILIZED → RESOLVED. Stages may
 * be skipped (a field report can jump straight to RESPONSE_ACTIVE) but never
 * reversed — an un-verification would corrupt the response record. Only an
 * ADMIN may move an incident backwards, for genuine corrections.
 *
 * `INCIDENT_STATUS_TRANSITIONS` (packages/shared) stays the strict
 * single-step map; it is what the UI offers as the "next step" suggestion.
 */
const STATUS_ORDER: IncidentStatus[] = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED", "RESOLVED"];

function statusLabel(s: IncidentStatus) {
  return s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export function nextStatus(current: IncidentStatus): IncidentStatus | null {
  return INCIDENT_STATUS_TRANSITIONS[current]?.[0] ?? null;
}

export function canTransition(from: IncidentStatus, to: IncidentStatus, isAdmin: boolean): boolean {
  if (from === to) return false;
  if (isAdmin) return true;
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
}

export async function listIncidents(query: IncidentQuery): Promise<{ items: IncidentListItemDTO[]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getIncidentRepository().list({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

export async function getIncident(id: string): Promise<IncidentDetailDTO> {
  const repo = getIncidentRepository();
  const incident = await repo.findById(id);
  if (!incident) throw AppError.notFound("Incident not found.", MODULE);
  const timeline = await repo.timeline(id);
  return { ...incident, timeline };
}

export async function createIncident(input: CreateIncidentInput, user: { id: string; name: string; role: string }) {
  const repo = getIncidentRepository();
  const title = input.title ?? `${input.disasterType} — ${input.location}`;
  const incident = await repo.create(input, user.id, title);
  recordAudit({
    userId: user.id,
    action: "created",
    entityType: "Incident",
    entityId: incident.id,
    metadata: { label: "Incident reported", detail: `${incident.severity} · ${incident.location}` },
  });

  // Optional one-click companion alert ("this is an emergency — tell people").
  // Best-effort: an alert failure never fails the incident report itself.
  if (input.alertSeverity) {
    try {
      await createAlert(
        {
          title: `${incident.severity === "CRITICAL" ? "CRITICAL" : "URGENT"} — ${incident.title}`,
          message: incident.description.slice(0, 500),
          severity: input.alertSeverity as AlertSeverity,
          affectedArea: incident.location,
          relatedIncidentId: incident.id,
          publish: true,
        },
        user.id
      );
    } catch {
      /* alert module unavailable — the incident is still recorded */
    }
  }
  return getIncident(incident.id);
}

export async function updateIncident(id: string, patch: Record<string, unknown>, user: { id: string; name: string }) {
  const repo = getIncidentRepository();
  const before = await repo.findById(id);
  if (!before) throw AppError.notFound("Incident not found.", MODULE);

  const changed: string[] = [];
  for (const key of Object.keys(patch)) {
    if (JSON.stringify((before as unknown as Record<string, unknown>)[key]) !== JSON.stringify(patch[key])) {
      changed.push(key);
    }
  }
  const updated = await repo.update(id, patch);
  if (changed.length > 0) {
    recordAudit({
      userId: user.id,
      action: "updated",
      entityType: "Incident",
      entityId: id,
      metadata: { label: "Incident details updated", detail: changed.join(", ") },
    });
  }
  return getIncident(id).catch(() => updated);
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  user: { id: string; name: string; role: string },
  note?: string
) {
  const repo = getIncidentRepository();
  const current = await repo.findById(id);
  if (!current) throw AppError.notFound("Incident not found.", MODULE);
  if (current.status === status) throw AppError.conflict(`Incident is already ${statusLabel(status)}.`, MODULE);
  if (!canTransition(current.status, status, user.role === "ADMIN")) {
    throw AppError.conflict(
      `An incident cannot move from ${statusLabel(current.status)} back to ${statusLabel(status)}. Only an administrator can correct this.`,
      MODULE
    );
  }
  const updated = await repo.setStatus(id, status);
  recordAudit({
    userId: user.id,
    action: "status",
    entityType: "Incident",
    entityId: id,
    metadata: { label: `Status → ${statusLabel(status)}`, detail: note ?? `${statusLabel(current.status)} → ${statusLabel(status)}` },
  });
  return { ...updated, timeline: await repo.timeline(id) };
}

export async function assignTeam(id: string, teamId: string | null, user: { id: string; name: string }, note?: string) {
  const repo = getIncidentRepository();
  const current = await repo.findById(id);
  if (!current) throw AppError.notFound("Incident not found.", MODULE);
  if (teamId) {
    const team = await getTeamRepository().findById(teamId);
    if (!team) throw AppError.validation("That rescue team no longer exists.", MODULE);
  }
  const updated = await repo.assignTeam(id, teamId);
  recordAudit({
    userId: user.id,
    action: "assigned",
    entityType: "Incident",
    entityId: id,
    metadata: {
      label: teamId ? `Team assigned: ${updated.assignedTeamName}` : "Team unassigned",
      detail: note ?? (current.assignedTeamName ?? "none") + " → " + (updated.assignedTeamName ?? "none"),
    },
  });
  return { ...updated, timeline: await repo.timeline(id) };
}
