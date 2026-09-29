import { prisma, isDatabaseAvailable } from "../db/prisma";
import { logger } from "./logger";

/**
 * Append-only operational audit trail. Incidents use it as their timeline
 * (docs/API_DESIGN.md `PATCH /api/incidents/:id/status`).
 *
 * Deliberately fire-and-forget and never awaited by callers: a failure to
 * write a log line must never roll back or fail the user's actual action
 * (error isolation, docs/ARCHITECTURE.md §3).
 */
export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
}

export function recordAudit(entry: AuditEntry): void {
  if (!isDatabaseAvailable()) return;
  void (prisma as any)
    .auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
      },
    })
    .catch((err: Error) => logger.warn({ err: err.message, action: entry.action }, "Audit log write failed"));
}
