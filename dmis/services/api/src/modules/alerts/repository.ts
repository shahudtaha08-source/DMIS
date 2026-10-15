/** Alerts (Chunk 10). Publishing is a status transition, never a delete — an
 *  expired CRITICAL alert must stay auditable after it stops being shown. */
import type { AlertListItemDTO, AlertSeverity, AlertStatus } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { AlertQuery, CreateAlertInput } from "./validation";

export interface AlertRepository {
  list(query: AlertQuery & { page: number; pageSize: number }): Promise<{ items: AlertListItemDTO[]; total: number }>;
  active(limit: number): Promise<AlertListItemDTO[]>;
  findById(id: string): Promise<AlertListItemDTO | null>;
  create(input: CreateAlertInput, createdById: string, status: AlertStatus, validUntil: Date): Promise<AlertListItemDTO>;
  update(id: string, patch: Record<string, unknown>): Promise<AlertListItemDTO>;
  setStatus(id: string, status: AlertStatus): Promise<AlertListItemDTO>;
  publishForAllUsers(id: string): Promise<number>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Alert data is temporarily unavailable.", "alerts");
  }
  return prisma as any;
}

const WITH_REFS = {
  createdBy: { select: { id: true, name: true } },
  relatedIncident: { select: { id: true, title: true } },
} as const;

type Row = {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  affectedArea: string;
  validFrom: Date;
  validUntil: Date;
  relatedIncidentId: string | null;
  createdById: string;
  createdBy: { id: string; name: string } | null;
  relatedIncident: { id: string; title: string } | null;
  createdAt: Date;
};

const toDTO = (r: Row): AlertListItemDTO => ({
  id: r.id,
  title: r.title,
  message: r.message,
  severity: r.severity,
  status: r.status,
  affectedArea: r.affectedArea,
  validFrom: new Date(r.validFrom).toISOString(),
  validUntil: new Date(r.validUntil).toISOString(),
  relatedIncidentId: r.relatedIncidentId,
  createdById: r.createdById,
  createdByName: r.createdBy?.name ?? "Unknown",
  relatedIncidentTitle: r.relatedIncident?.title ?? null,
  createdAt: new Date(r.createdAt).toISOString(),
});

export class PrismaAlertRepository implements AlertRepository {
  async list(query: AlertQuery & { page: number; pageSize: number }) {
    const p = db();
    const where: Record<string, unknown> = {};
    if (query.status?.length) where.status = { in: query.status };
    if (query.severity?.length) where.severity = { in: query.severity };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { message: { contains: query.q, mode: "insensitive" } },
        { affectedArea: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.active === "true") {
      where.status = "PUBLISHED";
      where.validUntil = { gte: new Date() };
    }
    const [rows, total] = await Promise.all([
      p.alert.findMany({
        where,
        include: WITH_REFS,
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      p.alert.count({ where }),
    ]);
    return { items: (rows as Row[]).map(toDTO), total: total as number };
  }

  async active(limit: number) {
    const rows = await db().alert.findMany({
      where: { status: "PUBLISHED", validUntil: { gte: new Date() } },
      include: WITH_REFS,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return (rows as Row[]).map(toDTO);
  }

  async findById(id: string) {
    const r = (await db().alert.findUnique({ where: { id }, include: WITH_REFS })) as Row | null;
    return r ? toDTO(r) : null;
  }

  async create(input: CreateAlertInput, createdById: string, status: AlertStatus, validUntil: Date) {
    const r = (await db().alert.create({
      data: {
        title: input.title,
        message: input.message,
        severity: input.severity,
        affectedArea: input.affectedArea,
        relatedIncidentId: input.relatedIncidentId ?? null,
        validFrom: input.validFrom ?? new Date(),
        validUntil,
        createdById,
        status,
      },
      include: WITH_REFS,
    })) as Row;
    return toDTO(r);
  }

  async update(id: string, patch: Record<string, unknown>) {
    const r = (await db().alert.update({ where: { id }, data: patch, include: WITH_REFS })) as Row;
    return toDTO(r);
  }

  async setStatus(id: string, status: AlertStatus) {
    const r = (await db().alert.update({ where: { id }, data: { status }, include: WITH_REFS })) as Row;
    return toDTO(r);
  }

  /** Database-backed notification centre: publishing an alert fans out one
   *  Notification row per active user. No push infrastructure required
   *  (submission rule: "complex notification infrastructure → database-backed
   *  notification center"). */
  async publishForAllUsers(id: string) {
    const users = (await db().user.findMany({ where: { isActive: true }, select: { id: true } })) as { id: string }[];
    if (users.length === 0) return 0;
    const result = await db().notification.createMany({
      data: users.map((u) => ({ userId: u.id, relatedAlertId: id })),
    });
    return result?.count ?? users.length;
  }
}

let current: AlertRepository | null = null;
export function getAlertRepository(): AlertRepository {
  return (current ??= new PrismaAlertRepository());
}
export function setAlertRepository(repo: AlertRepository | null) {
  current = repo;
}
