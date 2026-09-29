/** Rescue Teams (Chunk 13). Team status and incident assignment are kept
 *  consistent by the services that touch both, not by the database. */
import type { RescueTeamListItemDTO, TeamStatus } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { CreateTeamInput, TeamQuery } from "./validation";

export interface TeamRepository {
  list(query: TeamQuery & { page: number; pageSize: number }): Promise<{ items: RescueTeamListItemDTO[]; total: number }>;
  findById(id: string): Promise<RescueTeamListItemDTO | null>;
  create(input: CreateTeamInput): Promise<RescueTeamListItemDTO>;
  update(id: string, patch: Record<string, unknown>): Promise<RescueTeamListItemDTO>;
  setStatus(id: string, status: TeamStatus): Promise<RescueTeamListItemDTO>;
  activeIncidentCount(): Promise<number>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Rescue team data is temporarily unavailable.", "teams");
  }
  return prisma as any;
}

type Row = {
  id: string;
  name: string;
  specialization: string;
  status: TeamStatus;
  currentIncidentId: string | null;
  baseLocation: string | null;
  updatedAt: Date;
  _count?: { incidents: number };
  incidents?: { id: string; title: string; status: string }[];
};

function toDTO(r: Row): RescueTeamListItemDTO {
  const active = (r.incidents ?? []).filter((i) => i.status !== "RESOLVED");
  return {
    id: r.id,
    name: r.name,
    specialization: r.specialization,
    status: r.status,
    baseLocation: r.baseLocation ?? null,
    activeIncidents: active.length || r._count?.incidents || 0,
    currentIncidentId: r.currentIncidentId,
    currentIncidentTitle: r.incidents?.[0]?.title ?? null,
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export class PrismaTeamRepository implements TeamRepository {
  async list(query: TeamQuery & { page: number; pageSize: number }) {
    const p = db();
    const where: Record<string, unknown> = {};
    if (query.status?.length) where.status = { in: query.status };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { specialization: { contains: query.q, mode: "insensitive" } },
        { baseLocation: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      p.rescueTeam.findMany({
        where,
        include: { incidents: { select: { id: true, title: true, status: true } }, _count: { select: { incidents: true } } },
        orderBy: { [query.sort]: query.order } as Record<string, string>,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      p.rescueTeam.count({ where }),
    ]);
    return { items: (rows as Row[]).map(toDTO), total: total as number };
  }

  async findById(id: string) {
    const r = (await db().rescueTeam.findUnique({
      where: { id },
      include: { incidents: { select: { id: true, title: true, status: true } }, _count: { select: { incidents: true } } },
    })) as Row | null;
    return r ? toDTO(r) : null;
  }

  async create(input: CreateTeamInput) {
    const r = (await db().rescueTeam.create({
      data: input,
      include: { incidents: { select: { id: true, title: true, status: true } } },
    })) as Row;
    return toDTO(r);
  }

  async update(id: string, patch: Record<string, unknown>) {
    const r = (await db().rescueTeam.update({
      where: { id },
      data: patch,
      include: { incidents: { select: { id: true, title: true, status: true } } },
    })) as Row;
    return toDTO(r);
  }

  async setStatus(id: string, status: TeamStatus) {
    return this.update(id, { status });
  }

  async activeIncidentCount() {
    return (await db().rescueTeam.count({ where: { status: { in: ["AVAILABLE", "DEPLOYED"] } } })) as number;
  }
}

let current: TeamRepository | null = null;
export function getTeamRepository(): TeamRepository {
  return (current ??= new PrismaTeamRepository());
}
export function setTeamRepository(repo: TeamRepository | null) {
  current = repo;
}
