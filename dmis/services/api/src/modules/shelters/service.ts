import type { ShelterListItemDTO, ShelterStatus, PaginationMeta } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { recordAudit } from "../../lib/audit";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { getShelterRepository } from "./repository";
import type { CreateShelterInput, ShelterQuery } from "./validation";

const MODULE = "shelters";

export async function listShelters(query: ShelterQuery): Promise<{ items: ShelterListItemDTO[]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getShelterRepository().list({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

export async function getShelter(id: string): Promise<ShelterListItemDTO> {
  const shelter = await getShelterRepository().findById(id);
  if (!shelter) throw AppError.notFound("Shelter not found.", MODULE);
  return shelter;
}

export async function createShelter(input: CreateShelterInput, userId: string) {
  if ((input.currentOccupancy ?? 0) > input.capacity) {
    throw AppError.validation("Occupancy cannot exceed capacity.", MODULE);
  }
  const shelter = await getShelterRepository().create(input);
  recordAudit({ userId, action: "created", entityType: "Shelter", entityId: shelter.id, metadata: { label: `Shelter created: ${shelter.name}` } });
  return shelter;
}

export async function updateShelter(id: string, patch: Record<string, unknown>, userId: string) {
  const repo = getShelterRepository();
  const before = await repo.findById(id);
  if (!before) throw AppError.notFound("Shelter not found.", MODULE);
  const nextCapacity = (patch.capacity as number | undefined) ?? before.capacity;
  const nextOccupancy = (patch.currentOccupancy as number | undefined) ?? before.currentOccupancy;
  if (nextOccupancy > nextCapacity) throw AppError.validation("Occupancy cannot exceed capacity.", MODULE);
  const shelter = await repo.update(id, patch);
  recordAudit({ userId, action: "updated", entityType: "Shelter", entityId: id, metadata: { label: `Shelter updated: ${shelter.name}` } });
  return shelter;
}

export async function updateOccupancy(id: string, currentOccupancy: number, status: ShelterStatus | undefined, userId: string) {
  const repo = getShelterRepository();
  const before = await repo.findById(id);
  if (!before) throw AppError.notFound("Shelter not found.", MODULE);
  if (currentOccupancy > before.capacity) {
    throw AppError.validation(`Occupancy (${currentOccupancy}) cannot exceed capacity (${before.capacity}).`, MODULE);
  }
  // Status follows reality unless the caller states otherwise: a shelter at
  // capacity is FULL, one that has room is OPEN again.
  const nextStatus: ShelterStatus = status ?? (currentOccupancy >= before.capacity ? "FULL" : "OPEN");
  const shelter = await repo.update(id, { currentOccupancy, status: nextStatus });
  recordAudit({
    userId,
    action: "updated",
    entityType: "Shelter",
    entityId: id,
    metadata: { label: `Occupancy ${before.currentOccupancy} → ${currentOccupancy}`, detail: shelter.name },
  });
  return shelter;
}
