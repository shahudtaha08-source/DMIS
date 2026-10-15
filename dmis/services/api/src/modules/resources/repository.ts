/** Resource inventory (Chunk 12).
 *
 *  `Resource.quantityAvailable` is maintained from the append-only
 *  `resource_transactions` ledger inside `applyTransaction`, in a single
 *  Prisma transaction, so stock can never drift from its history. Clients
 *  never write the quantity column directly.
 */
import type { ResourceListItemDTO, ResourceStatus, ResourceTransactionDTO, ResourceTransactionType } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { CreateResourceInput, ResourceQuery } from "./validation";

export interface ResourceRepository {
  list(query: ResourceQuery & { page: number; pageSize: number }): Promise<{ items: ResourceListItemDTO[]; total: number }>;
  findById(id: string): Promise<ResourceListItemDTO | null>;
  create(input: CreateResourceInput, performedById: string): Promise<ResourceListItemDTO>;
  update(id: string, patch: Record<string, unknown>): Promise<ResourceListItemDTO>;
  applyTransaction(
    id: string,
    txn: { type: ResourceTransactionType; quantity: number; relatedIncidentId?: string | null; performedById: string }
  ): Promise<{ resource: ResourceListItemDTO; transaction: ResourceTransactionDTO }>;
  transactions(resourceId: string, limit: number): Promise<ResourceTransactionDTO[]>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Resource data is temporarily unavailable.", "resources");
  }
  return prisma as any;
}

type Row = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  status: ResourceStatus;
  locationId: string | null;
  updatedAt: Date;
  location?: { id: string; name: string } | null;
  allocated?: number;
};

function statusFor(available: number, threshold: number): ResourceStatus {
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= threshold) return "LOW_STOCK";
  return "AVAILABLE";
}

export function toResourceDTO(r: Row, allocated: number): ResourceListItemDTO {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    quantityAvailable: r.quantityAvailable,
    allocated,
    lowStockThreshold: r.lowStockThreshold,
    status: r.status,
    isLowStock: r.status !== "AVAILABLE",
    locationId: r.locationId,
    locationName: r.location?.name ?? null,
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

/** Net (allocations − returns) drawn from the ledger for the listed items. */
async function allocatedByResource(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  const rows = (await db().resourceTransaction.groupBy({
    by: ["resourceId", "type"],
    _sum: { quantity: true },
    where: { resourceId: { in: ids } },
  })) as { resourceId: string; type: ResourceTransactionType; _sum: { quantity: number | null } }[];
  for (const r of rows) {
    const qty = r._sum.quantity ?? 0;
    const delta = r.type === "ALLOCATION" ? qty : r.type === "RETURN" ? -qty : 0;
    map.set(r.resourceId, (map.get(r.resourceId) ?? 0) + delta);
  }
  return map;
}

const INCLUDE = { location: { select: { id: true, name: true } } } as const;

export class PrismaResourceRepository implements ResourceRepository {
  async list(query: ResourceQuery & { page: number; pageSize: number }) {
    const p = db();
    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;
    if (query.status?.length) where.status = { in: query.status };
    if (query.lowStockOnly === "true") where.status = { in: ["LOW_STOCK", "OUT_OF_STOCK"] };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { category: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const total = (await p.resource.count({ where })) as number;
    const rows = (await p.resource.findMany({
      where,
      include: INCLUDE,
      orderBy: { [query.sort]: query.order } as Record<string, string>,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    })) as Row[];
    const allocated = await allocatedByResource(rows.map((r) => r.id));
    return {
      items: rows.map((r) => toResourceDTO(r, allocated.get(r.id) ?? 0)),
      total,
    };
  }

  async findById(id: string) {
    const r = (await db().resource.findUnique({ where: { id }, include: INCLUDE })) as Row | null;
    if (!r) return null;
    const allocated = await allocatedByResource([id]);
    return toResourceDTO(r, allocated.get(id) ?? 0);
  }

  async create(input: CreateResourceInput, performedById: string) {
    const p = db();
    const status = statusFor(input.quantityAvailable ?? 0, input.lowStockThreshold ?? 0);
    const created = await p.resource.create({
      data: { ...input, quantityAvailable: input.quantityAvailable ?? 0, status },
    });
    if ((input.quantityAvailable ?? 0) > 0) {
      // Opening stock is itself a ledger entry, so item history is complete
      // from the first row rather than starting at the first restock.
      await p.resourceTransaction.create({
        data: { type: "RESTOCK", quantity: input.quantityAvailable, resourceId: created.id, performedById },
      });
    }
    const r = (await p.resource.findUnique({ where: { id: created.id }, include: INCLUDE })) as Row;
    return toResourceDTO(r, 0);
  }

  async update(id: string, patch: Record<string, unknown>) {
    const p = db();
    const before = (await p.resource.findUnique({ where: { id } })) as Row | null;
    if (!before) throw AppError.notFound("Resource not found.", "resources");
    const quantity = (patch.quantityAvailable as number | undefined) ?? before.quantityAvailable;
    const threshold = (patch.lowStockThreshold as number | undefined) ?? before.lowStockThreshold;
    await p.resource.update({ where: { id }, data: { ...patch, status: statusFor(quantity, threshold) } });
    const r = (await p.resource.findUnique({ where: { id }, include: INCLUDE })) as Row;
    const allocated = await allocatedByResource([id]);
    return toResourceDTO(r, allocated.get(id) ?? 0);
  }

  async applyTransaction(
    id: string,
    txn: { type: ResourceTransactionType; quantity: number; relatedIncidentId?: string | null; performedById: string }
  ) {
    const p = db();
    const before = (await p.resource.findUnique({ where: { id } })) as Row | null;
    if (!before) throw AppError.notFound("Resource not found.", "resources");

    const delta = txn.type === "RESTOCK" ? txn.quantity : txn.type === "ALLOCATION" ? -txn.quantity : txn.quantity;
    if (before.quantityAvailable + delta < 0) {
      throw AppError.conflict(`Only ${before.quantityAvailable} ${before.unit} of ${before.name} left in stock.`, "resources");
    }
    const quantityAvailable = before.quantityAvailable + delta;

    const [created] = await p.$transaction([
      p.resourceTransaction.create({
        data: {
          type: txn.type,
          quantity: txn.quantity,
          resourceId: id,
          relatedIncidentId: txn.relatedIncidentId ?? null,
          performedById: txn.performedById,
        },
      }),
      p.resource.update({
        where: { id },
        data: { quantityAvailable, status: statusFor(quantityAvailable, before.lowStockThreshold) },
      }),
    ]);

    const r = (await p.resource.findUnique({ where: { id }, include: INCLUDE })) as Row;
    const allocated = await allocatedByResource([id]);
    return {
      resource: toResourceDTO(r, allocated.get(id) ?? 0),
      transaction: {
        id: created.id,
        resourceId: created.resourceId,
        type: created.type,
        quantity: created.quantity,
        relatedIncidentId: created.relatedIncidentId,
        performedById: created.performedById,
        createdAt: new Date(created.createdAt).toISOString(),
      } as ResourceTransactionDTO,
    };
  }

  async transactions(resourceId: string, limit: number) {
    const rows = (await db().resourceTransaction.findMany({
      where: { resourceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    })) as any[];
    return rows.map((t) => ({
      id: t.id,
      resourceId: t.resourceId,
      type: t.type,
      quantity: t.quantity,
      relatedIncidentId: t.relatedIncidentId,
      performedById: t.performedById,
      createdAt: new Date(t.createdAt).toISOString(),
    })) as ResourceTransactionDTO[];
  }
}

let current: ResourceRepository | null = null;
export function getResourceRepository(): ResourceRepository {
  return (current ??= new PrismaResourceRepository());
}
export function setResourceRepository(repo: ResourceRepository | null) {
  current = repo;
}
