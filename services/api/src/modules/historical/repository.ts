/**
 * Data access for the Historical Disaster Explorer (Chunk 7). Read-only —
 * nothing in the application ever writes to historical_disasters; rows come
 * from prisma/imports/import-historical.ts alone.
 */
import type { GeoPointDTO, HistoricalDisasterDetailDTO, HistoricalDisasterListItemDTO } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import type { HistoricalQuery } from "./validation";

export interface HistoricalPage {
  items: HistoricalDisasterListItemDTO[];
  total: number;
}

export interface HistoricalRepository {
  search(query: HistoricalQuery): Promise<HistoricalPage>;
  findById(idOrDisNo: string): Promise<HistoricalDisasterDetailDTO | null>;
  filterOptions(): Promise<{
    types: { value: string; count: number }[];
    subtypes: { value: string; count: number }[];
    locations: { value: string; count: number }[];
    groups: { value: string; count: number }[];
    yearMin: number | null;
    yearMax: number | null;
    total: number;
    withCoordinates: number;
  }>;
  geoPoints(limit: number): Promise<GeoPointDTO[]>;
  totalCount(): Promise<number>;
  byType(limit: number): Promise<{ type: string; count: number }[]>;
  byDecade(): Promise<{ decade: number; count: number }[]>;
  byRegion(limit: number): Promise<{ region: string; count: number }[]>;
  sumAffected(): Promise<number>;
  sumDeaths(): Promise<number>;
}

function db() {
  if (!isDatabaseAvailable()) {
    throw AppError.serviceUnavailable("Historical disaster data is temporarily unavailable.", "historical");
  }
  return prisma as any;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const LIST_SELECT = {
  id: true,
  disNo: true,
  eventName: true,
  disasterGroup: true,
  disasterType: true,
  disasterSubtype: true,
  location: true,
  startYear: true,
  totalAffected: true,
  totalDeaths: true,
  latitude: true,
  longitude: true,
} as const;

type ListRow = {
  id: string;
  disNo: string;
  eventName: string | null;
  disasterGroup: string;
  disasterType: string;
  disasterSubtype: string | null;
  location: string | null;
  startYear: number;
  totalAffected: number | null;
  totalDeaths: number | null;
  latitude: unknown;
  longitude: unknown;
};

function toListItem(r: ListRow): HistoricalDisasterListItemDTO {
  return {
    id: r.id,
    disNo: r.disNo,
    eventName: r.eventName,
    disasterGroup: r.disasterGroup,
    disasterType: r.disasterType,
    disasterSubtype: r.disasterSubtype,
    location: r.location,
    startYear: r.startYear,
    totalAffected: r.totalAffected,
    totalDeaths: r.totalDeaths,
    hasCoordinates: num(r.latitude) !== null && num(r.longitude) !== null,
  };
}

export class PrismaHistoricalRepository implements HistoricalRepository {
  async search(query: HistoricalQuery): Promise<HistoricalPage> {
    const p = db();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Record<string, unknown> = {};

    if (query.q) {
      // Free-text search across the fields a responder would actually recall.
      where.OR = [
        { eventName: { contains: query.q, mode: "insensitive" } },
        { location: { contains: query.q, mode: "insensitive" } },
        { disNo: { contains: query.q, mode: "insensitive" } },
        { disasterType: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.type) where.disasterType = query.type;
    if (query.subtype) where.disasterSubtype = query.subtype;
    if (query.group) where.disasterGroup = query.group;
    if (query.location) where.location = { contains: query.location, mode: "insensitive" };
    if (query.yearFrom !== undefined || query.yearTo !== undefined) {
      where.startYear = {
        ...(query.yearFrom !== undefined ? { gte: query.yearFrom } : {}),
        ...(query.yearTo !== undefined ? { lte: query.yearTo } : {}),
      };
    }
    if (query.minDeaths !== undefined) where.totalDeaths = { gte: query.minDeaths };
    if (query.minAffected !== undefined) where.totalAffected = { gte: query.minAffected };
    if (query.hasCoordinates) {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }

    const orderBy = { [query.sort]: query.order } as Record<string, string>;
    const [rows, total] = await Promise.all([
      p.historicalDisaster.findMany({ where, select: LIST_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      p.historicalDisaster.count({ where }),
    ]);
    return { items: (rows as ListRow[]).map(toListItem), total: total as number };
  }

  async findById(idOrDisNo: string): Promise<HistoricalDisasterDetailDTO | null> {
    const p = db();
    const r =
      (await p.historicalDisaster.findFirst({
        where: { OR: [{ id: idOrDisNo }, { disNo: idOrDisNo }] },
      })) ?? null;
    if (!r) return null;
    return {
      id: r.id,
      disNo: r.disNo,
      historic: r.historic,
      classificationKey: r.classificationKey,
      disasterGroup: r.disasterGroup,
      disasterSubgroup: r.disasterSubgroup,
      disasterType: r.disasterType,
      disasterSubtype: r.disasterSubtype,
      eventName: r.eventName,
      location: r.location,
      origin: r.origin,
      magnitude: num(r.magnitude),
      magnitudeScale: r.magnitudeScale,
      latitude: num(r.latitude),
      longitude: num(r.longitude),
      startYear: r.startYear,
      startMonth: r.startMonth,
      startDay: r.startDay,
      endYear: r.endYear,
      endMonth: r.endMonth,
      endDay: r.endDay,
      totalDeaths: r.totalDeaths,
      noInjured: r.noInjured,
      noAffected: r.noAffected,
      noHomeless: r.noHomeless,
      totalAffected: r.totalAffected,
      totalDamageUsd000: num(r.totalDamageUsd000),
      adminUnitsRaw: r.adminUnitsRaw ?? null,
      iso: r.iso,
      country: r.country,
      subregion: r.subregion,
      region: r.region,
      riverBasin: r.riverBasin,
      appeal: r.appeal,
      declaration: r.declaration,
      ofdaBhaResponse: r.ofdaBhaResponse,
      aidContributionUsd000: num(r.aidContributionUsd000),
      reconstructionCostsUsd000: num(r.reconstructionCostsUsd000),
      totalDamageAdjUsd000: num(r.totalDamageAdjUsd000),
      insuredDamageUsd000: num(r.insuredDamageUsd000),
      cpi: num(r.cpi),
      associatedTypes: r.associatedTypes,
      entryDate: r.entryDate ? new Date(r.entryDate).toISOString() : null,
      lastUpdate: r.lastUpdate ? new Date(r.lastUpdate).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }

  async filterOptions() {
    const p = db();
    const [types, subtypes, locations, groups, yearAgg, total, withCoordinates] = await Promise.all([
      p.historicalDisaster.groupBy({ by: ["disasterType"], _count: { _all: true }, orderBy: { _count: { disasterType: "desc" } } }),
      p.historicalDisaster.groupBy({ by: ["disasterSubtype"], _count: { _all: true }, orderBy: { _count: { disasterSubtype: "desc" } } }),
      p.historicalDisaster.groupBy({ by: ["location"], _count: { _all: true }, orderBy: { _count: { location: "desc" } }, take: 60 }),
      p.historicalDisaster.groupBy({ by: ["disasterGroup"], _count: { _all: true }, orderBy: { disasterGroup: "asc" } }),
      p.historicalDisaster.aggregate({ _min: { startYear: true }, _max: { startYear: true } }),
      p.historicalDisaster.count(),
      p.historicalDisaster.count({ where: { AND: [{ latitude: { not: null } }, { longitude: { not: null } }] } }),
    ]);

    const map = (rows: unknown, key: string) => groupRows(rows, key, "value");

    return {
      types: map(types, "disasterType"),
      subtypes: map(subtypes, "disasterSubtype"),
      locations: map(locations, "location"),
      groups: map(groups, "disasterGroup"),
      yearMin: (yearAgg as any)._min.startYear ?? null,
      yearMax: (yearAgg as any)._max.startYear ?? null,
      total: total as number,
      withCoordinates: withCoordinates as number,
    };
  }

  async geoPoints(limit: number): Promise<GeoPointDTO[]> {
    const p = db();
    const rows = await p.historicalDisaster.findMany({
      where: { AND: [{ latitude: { not: null } }, { longitude: { not: null } }] },
      select: { id: true, latitude: true, longitude: true, eventName: true, location: true, disasterType: true, startYear: true, totalAffected: true },
      orderBy: { totalDeaths: "desc" },
      take: limit,
    });
    return (rows as any[])
      .map((r) => ({
        id: r.id,
        latitude: num(r.latitude)!,
        longitude: num(r.longitude)!,
        label: r.eventName ?? r.location ?? r.disasterType,
        year: r.startYear,
        totalAffected: r.totalAffected,
      }))
      .filter((p2) => Number.isFinite(p2.latitude) && Number.isFinite(p2.longitude));
  }

  async totalCount() {
    return (await db().historicalDisaster.count()) as number;
  }

  async byType(limit: number) {
    const rows = await db().historicalDisaster.groupBy({
      by: ["disasterType"],
      _count: { _all: true },
      orderBy: { _count: { disasterType: "desc" } },
      take: limit,
    });
    return map2(rows, "disasterType", "type");
  }

  async byDecade() {
    const rows = await db().historicalDisaster.groupBy({ by: ["startYear"], _count: { _all: true } });
    const buckets = new Map<number, number>();
    for (const r of rows as { startYear: number; _count: { _all: number } }[]) {
      const decade = Math.floor(r.startYear / 10) * 10;
      buckets.set(decade, (buckets.get(decade) ?? 0) + r._count._all);
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count }));
  }

  async byRegion(limit: number) {
    const rows = await db().historicalDisaster.groupBy({
      by: ["region"],
      _count: { _all: true },
      orderBy: { _count: { region: "desc" } },
      take: limit,
    });
    return map2(rows, "region", "region");
  }

  async sumAffected() {
    const agg = await db().historicalDisaster.aggregate({ _sum: { totalAffected: true } });
    return (agg as any)._sum.totalAffected ?? 0;
  }

  async sumDeaths() {
    const agg = await db().historicalDisaster.aggregate({ _sum: { totalDeaths: true } });
    return (agg as any)._sum.totalDeaths ?? 0;
  }
}

/** Prisma `groupBy` rows are untyped here (the client is deliberately `any`),
 *  so this is the one place that reshapes them into `{ value, count }`. */
type GroupRow = Record<string, unknown> & { _count: { _all: number } };

function groupRows<T extends string>(rows: unknown, groupKey: string, outKey: T) {
  return (rows as GroupRow[])
    .filter((r) => r[groupKey] !== null && r[groupKey] !== undefined && r[groupKey] !== "")
    .map((r) => ({ [outKey]: String(r[groupKey]), count: r._count._all })) as ({ [K in T]: string } & { count: number })[];
}

function map2<T extends string>(rows: unknown, groupKey: string, outKey: T) {
  return groupRows(rows, groupKey, outKey);
}

let current: HistoricalRepository | null = null;
export function getHistoricalRepository(): HistoricalRepository {
  return (current ??= new PrismaHistoricalRepository());
}
export function setHistoricalRepository(repo: HistoricalRepository | null) {
  current = repo;
}
