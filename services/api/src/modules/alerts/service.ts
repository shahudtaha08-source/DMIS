import { AlertSeverity, type AlertListItemDTO, type PaginationMeta } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { recordAudit } from "../../lib/audit";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { getAlertRepository } from "./repository";
import type { AlertQuery, CreateAlertInput } from "./validation";

const MODULE = "alerts";
const DEFAULT_VALIDITY_HOURS = 24;

export async function listAlerts(query: AlertQuery): Promise<{ items: AlertListItemDTO[]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getAlertRepository().list({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

/** The single "what is the public being told right now" feed. Backs the
 *  dashboard banner, the web Alerts page and the Flutter Alerts tab, so all
 *  three always agree. */
export async function listActiveAlerts(limit = 20): Promise<AlertListItemDTO[]> {
  return getAlertRepository().active(limit);
}

export async function createAlert(input: CreateAlertInput, createdById: string): Promise<AlertListItemDTO> {
  const repo = getAlertRepository();
  const validUntil = input.validUntil ?? new Date(Date.now() + DEFAULT_VALIDITY_HOURS * 3600_000);
  if (validUntil.getTime() < Date.now() - 60_000) {
    throw AppError.validation("The alert validity end must be in the future.", MODULE);
  }
  const status = input.publish ? "PUBLISHED" : "DRAFT";
  const alert = await repo.create(input, createdById, status, validUntil);

  if (status === "PUBLISHED") {
    await repo.publishForAllUsers(alert.id).catch(() => 0);
    recordAudit({
      userId: createdById,
      action: "published",
      entityType: "Alert",
      entityId: alert.id,
      metadata: { label: `${alert.severity} alert published`, detail: alert.affectedArea },
    });
  }
  return alert;
}

export async function updateAlert(id: string, patch: Record<string, unknown>, userId: string) {
  const alert = await getAlertRepository().update(id, patch);
  recordAudit({ userId, action: "updated", entityType: "Alert", entityId: id, metadata: { label: "Alert updated" } });
  return alert;
}

export async function publishAlert(id: string, userId: string) {
  const repo = getAlertRepository();
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Alert not found.", MODULE);
  if (existing.status === "PUBLISHED") return existing;
  if (existing.status === "DEACTIVATED") {
    throw AppError.conflict("A deactivated alert cannot be republished. Create a new alert instead.", MODULE);
  }
  const alert = await repo.setStatus(id, "PUBLISHED");
  await repo.publishForAllUsers(id).catch(() => 0);
  recordAudit({ userId, action: "published", entityType: "Alert", entityId: id, metadata: { label: "Alert published" } });
  return alert;
}

export async function deactivateAlert(id: string, userId: string) {
  const repo = getAlertRepository();
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Alert not found.", MODULE);
  const alert = await repo.setStatus(id, "DEACTIVATED");
  recordAudit({ userId, action: "deactivated", entityType: "Alert", entityId: id, metadata: { label: "Alert deactivated" } });
  return alert;
}

/** Count of currently-published CRITICAL/HIGH alerts — used by the web
 *  dashboard banner and the Flutter dashboard card. */
export async function countProminentAlerts(): Promise<{ critical: number; high: number }> {
  const active = await listActiveAlerts(50);
  return {
    critical: active.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
    high: active.filter((a) => a.severity === AlertSeverity.WARNING || a.severity === AlertSeverity.ADVISORY).length,
  };
}
