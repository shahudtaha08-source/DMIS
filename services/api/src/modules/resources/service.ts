import type { PaginationMeta, ResourceListItemDTO, ResourceTransactionDTO } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { recordAudit } from "../../lib/audit";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { getResourceRepository } from "./repository";
import type { CreateResourceInput, ResourceQuery, TransactionInput } from "./validation";

const MODULE = "resources";

export async function listResources(query: ResourceQuery): Promise<{ items: ResourceListItemDTO[]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getResourceRepository().list({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

export async function createResource(input: CreateResourceInput, userId: string) {
  const resource = await getResourceRepository().create(input, userId);
  recordAudit({ userId, action: "created", entityType: "Resource", entityId: resource.id, metadata: { label: `${resource.name} added to inventory` } });
  return resource;
}

export async function updateResource(id: string, patch: Record<string, unknown>, userId: string) {
  const resource = await getResourceRepository().update(id, patch);
  recordAudit({ userId, action: "updated", entityType: "Resource", entityId: id, metadata: { label: `${resource.name} updated` } });
  return resource;
}

export async function postTransaction(id: string, input: TransactionInput, userId: string) {
  const result = await getResourceRepository().applyTransaction(id, {
    type: input.type,
    quantity: input.quantity,
    relatedIncidentId: input.relatedIncidentId ?? null,
    performedById: userId,
  });
  const verb = input.type === "RESTOCK" ? "Restocked" : input.type === "ALLOCATION" ? "Allocated" : "Returned";
  recordAudit({
    userId,
    action: "transaction",
    entityType: "Resource",
    entityId: id,
    metadata: { label: `${verb} ${input.quantity} ${result.resource.unit}`, detail: result.resource.name },
  });
  return result;
}

export async function listTransactions(id: string, limit = 25): Promise<ResourceTransactionDTO[]> {
  const repo = getResourceRepository();
  if (!(await repo.findById(id))) throw AppError.notFound("Resource not found.", MODULE);
  return repo.transactions(id, Math.min(100, Math.max(1, limit)));
}
