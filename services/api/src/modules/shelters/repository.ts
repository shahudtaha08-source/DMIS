/** Shelters (Chunk 11). `availableBeds` and `occupancyPercent` are computed
 *  server-side so the web list, the map markers and the Flutter list can never
 *  disagree about how full a shelter is. */
import type { ShelterListItemDTO, ShelterStatus } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { CreateShelterInput, ShelterQuery } from "./validation";

export interface ShelterRepository {
  list(query: ShelterQuery & { page: number; pageSize: number }): Promise<{ items: ShelterListItemDTO[]; total: number }>;
  findById(id: string): Promise<ShelterListItemDTO | null>;
  create(input: CreateShelterInput): Promise<ShelterListItemDTO>;
  update(id: string, patch: Record<string, unknown>): Promise<ShelterListItemDTO>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Shelter data is temporarily unavailable.", "shelters");
  }
  return prisma as any;
}

type Row = {
  id: string;
  name: string;
  latitude: unknown;
  longitude: unknown;
  address: string;
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: ShelterStatus;
  managerContact: string | null;
  updatedAt: Date;
};

export function toShelterDTO(r: Row): ShelterListItemDTO {
  const capacity = r.capacity ?? 0;
  const occupancy = Math.max(0, r.currentOccupancy ?? 0);
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    latitude: Number(r.latitude ?? 0),
    longitude: Number(r.longitude ?? 0),
    capacity,
    currentOccupancy: occupancy,
    availableBeds: Math.max(0, capacity - occupancy),
    occupancyPercent: capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0,
    facilities: r.facilities ?? [],
    status: r.status,
    managerContact: r.managerContact ?? null,
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

const SORTERS: Record<ShelterQuery["sort"], (a: ShelterListItemDTO, b: ShelterListItemDTO) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  availableBeds: (a, b) => a.availableBeds - b.availableBeds,
  occupancy: (a, b) => a.occupancyPercent - b.occupancyPercent,
  capacity: (a, b) => a.capacity - b.capacity,
};

export class PrismaShelterRepository implements ShelterRepository {
  async list(query: ShelterQuery & { page: number; pageSize: number }) {
    const p = db();
    const where: Record<string, unknown> = {};
    if (query.status?.length) where.status = { in: query.status };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { address: { contains: query.q, mode: "insensitive" } },
        { managerContact: { contains: query.q, mode: "insensitive" } },
      ];
    }
    // Sorting by a computed column (available beds / occupancy) is not
    // expressible in SQL, so the candidate set is ordered in application
    // code. Shelter counts are operational-scale (hundreds), not millions.
    const rows = (await p.shelter.findMany({ where, take: 500, orderBy: { name: "asc" } })) as Row[];
    const items = rows.map(toShelterDTO).filter((s) => (query.hasSpace === "true" ? s.availableBeds > 0 : true));
    items.sort(SORTERS[query.sort]);
    if (query.order === "desc") items.reverse();
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), total: items.length };
  }

  async findById(id: string) {
    const r = (await db().shelter.findUnique({ where: { id } })) as Row | null;
    return r ? toShelterDTO(r) : null;
  }

  async create(input: CreateShelterInput) {
    const r = (await db().shelter.create({ data: input })) as Row;
    return toShelterDTO(r);
  }

  async update(id: string, patch: Record<string, unknown>) {
    const r = (await db().shelter.update({ where: { id }, data: patch })) as Row;
    return toShelterDTO(r);
  }
}

let current: ShelterRepository | null = null;
export function getShelterRepository(): ShelterRepository {
  return (current ??= new PrismaShelterRepository());
}
export function setShelterRepository(repo: ShelterRepository | null) {
  current = repo;
}
