/**
 * Data access for Incident Management (Chunk 8). Display names are joined in
 * the same query as the rows so the list view never fans out into N+1 calls.
 */
import type { IncidentDetailDTO, IncidentListItemDTO, IncidentStatus, Severity } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { CreateIncidentInput, IncidentQuery } from "./validation";

export const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED"];

export interface IncidentRepository {
  list(query: IncidentQuery & { page: number; pageSize: number }): Promise<{ items: IncidentListItemDTO[]; total: number }>;
  findById(id: string): Promise<IncidentDetailDTO | null>;
  create(input: CreateIncidentInput, reportedById: string, title: string): Promise<IncidentDetailDTO>;
  update(id: string, patch: Record<string, unknown>): Promise<IncidentDetailDTO>;
  setStatus(id: string, status: IncidentStatus): Promise<IncidentDetailDTO>;
  assignTeam(id: string, teamId: string | null): Promise<IncidentDetailDTO>;
  timeline(id: string): Promise<IncidentDetailDTO["timeline"]>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Incident data is temporarily unavailable.", "incidents");
  }
  return prisma as any;
}

const WITH_REFS = {
  reportedBy: { select: { id: true, name: true } },
  assignedTeam: { select: { id: true, name: true } },
  _count: { select: { alerts: true } },
} as const;

type Row = {
  id: string;
  title: string;
  description: string;
  disasterType: string;
  severity: Severity;
  status: IncidentStatus;
  latitude: unknown;
  longitude: unknown;
  location: string;
  affectedPopulationEstimate: number | null;
  reportedById: string;
  reportedBy: { id: string; name: string } | null;
  assignedTeamId: string | null;
  assignedTeam: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  _count?: { alerts: number };
};

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

function toListItem(r: Row): IncidentListItemDTO {
  return {
    id: r.id,
    title: r.title,
    disasterType: r.disasterType,
    severity: r.severity,
    status: r.status,
    location: r.location,
    latitude: r.latitude === null || r.latitude === undefined ? null : Number(r.latitude),
    longitude: r.longitude === null || r.longitude === undefined ? null : Number(r.longitude),
    affectedPopulationEstimate: r.affectedPopulationEstimate,
    reportedByName: r.reportedBy?.name ?? "Unknown",
    assignedTeamId: r.assignedTeamId,
    assignedTeamName: r.assignedTeam?.name ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
    resolvedAt: iso(r.resolvedAt),
  };
}

function toDetail(r: Row): IncidentDetailDTO {
  return {
    ...toListItem(r),
    description: r.description,
    reportedById: r.reportedById,
    alertCount: r._count?.alerts ?? 0,
    timeline: [],
  };
}

export class PrismaIncidentRepository implements IncidentRepository {
  async list(query: IncidentQuery & { page: number; pageSize: number }) {
    const p = db();
    const skip = (query.page - 1) * query.pageSize;
    const where: Record<string, unknown> = {};
    if (query.status?.length) where.status = { in: query.status };
    if (query.severity?.length) where.severity = { in: query.severity };
    if (query.type) where.disasterType = query.type;
    if (query.active === "true") where.status = { in: ACTIVE_INCIDENT_STATUSES };
    if (query.active === "false") where.status = { in: ["RESOLVED"] };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { location: { contains: query.q, mode: "insensitive" } },
        { disasterType: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      p.incident.findMany({
        where,
        include: WITH_REFS,
        orderBy: { [query.sort]: query.order } as Record<string, string>,
        skip,
        take: query.pageSize,
      }),
      p.incident.count({ where }),
    ]);
    return { items: (rows as Row[]).map(toListItem), total: total as number };
  }

  async findById(id: string) {
    const r = (await db().incident.findUnique({ where: { id }, include: WITH_REFS })) as Row | null;
    return r ? toDetail(r) : null;
  }

  async create(input: CreateIncidentInput, reportedById: string, title: string) {
    const r = (await db().incident.create({
      data: {
        title,
        description: input.description,
        disasterType: input.disasterType,
        severity: input.severity,
        location: input.location,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        affectedPopulationEstimate: input.affectedPopulationEstimate ?? null,
        reportedById,
        status: "REPORTED",
      },
      include: WITH_REFS,
    })) as Row;
    return toDetail(r);
  }

  async update(id: string, patch: Record<string, unknown>) {
    const r = (await db().incident.update({ where: { id }, data: patch, include: WITH_REFS })) as Row;
    return toDetail(r);
  }

  async setStatus(id: string, status: IncidentStatus) {
    const r = (await db().incident.update({
      where: { id },
      data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
      include: WITH_REFS,
    })) as Row;
    return toDetail(r);
  }

  async assignTeam(id: string, teamId: string | null) {
    const r = (await db().incident.update({ where: { id }, data: { assignedTeamId: teamId }, include: WITH_REFS })) as Row;
    return toDetail(r);
  }

  async timeline(id: string) {
    const rows = (await db().auditLog.findMany({
      where: { entityType: "Incident", entityId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
    })) as { id: string; action: string; metadata: unknown; createdAt: Date; user: { name: string } | null }[];

    return rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        at: new Date(r.createdAt).toISOString(),
        kind: (["created", "status", "assigned", "updated"].includes(r.action) ? r.action : "updated") as
          | "created" | "status" | "assigned" | "updated",
        label: typeof meta.label === "string" ? meta.label : r.action,
        detail: typeof meta.detail === "string" ? meta.detail : null,
        actor: r.user?.name ?? null,
      };
    });
  }
}

let current: IncidentRepository | null = null;
export function getIncidentRepository(): IncidentRepository {
  return (current ??= new PrismaIncidentRepository());
}
export function setIncidentRepository(repo: IncidentRepository | null) {
  current = repo;
}
