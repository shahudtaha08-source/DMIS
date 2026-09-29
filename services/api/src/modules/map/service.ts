/**
 * Live Map (Chunk 9). One request, four independently-fetched layers.
 * Each layer is wrapped in its own try/catch: a failing layer is reported in
 * `unavailable` with an empty array, so a map with no shelters still renders
 * incidents and vice versa (docs/ARCHITECTURE.md §3, plan §6).
 *
 * Only records that genuinely have coordinates are included — the dataset has
 * ~93 of 783 with lat/lon and the remainder are simply absent.
 */
import type { GeoPointDTO, MapIncidentDTO, MapLayersDTO, MapShelterDTO, MapTeamDTO, Severity, IncidentStatus, ShelterStatus, TeamStatus } from "@dmis/shared";
import { logger } from "../../lib/logger";
import { isDatabaseAvailable, prisma } from "../../db/prisma";
import { getGeoPoints } from "../historical/service";

const ACTIVE_STATUSES = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED"];

export async function getMapLayers(limit = 500): Promise<MapLayersDTO> {
  const unavailable: string[] = [];

  async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      if (!isDatabaseAvailable()) throw new Error("database unavailable");
      return await fn();
    } catch (err) {
      logger.warn({ err: (err as Error).message, layer: name }, "Map layer unavailable");
      unavailable.push(name);
      return fallback;
    }
  }

  const [incidents, shelters, teams, historical] = await Promise.all([
    safe<MapIncidentDTO[]>("incidents", async () => {
      const rows = (await (prisma as any).incident.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        select: { id: true, title: true, severity: true, status: true, latitude: true, longitude: true, location: true },
        take: 500,
      })) as any[];
      return rows
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r) => ({
          id: r.id,
          title: r.title,
          severity: r.severity as Severity,
          status: r.status as IncidentStatus,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          location: r.location,
        }));
    }, []),
    safe<MapShelterDTO[]>("shelters", async () => {
      const rows = (await (prisma as any).shelter.findMany({
        where: { status: { not: "CLOSED" } },
        select: { id: true, name: true, latitude: true, longitude: true, capacity: true, currentOccupancy: true, status: true },
        take: 500,
      })) as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        availableBeds: Math.max(0, (r.capacity ?? 0) - (r.currentOccupancy ?? 0)),
        status: r.status as ShelterStatus,
      }));
    }, []),
    safe<MapTeamDTO[]>("teams", async () => {
      // Teams have no lat/lon of their own; they are anchored at their base
      // location text, so the map shows them as a list, not fake markers.
      const rows = (await (prisma as any).rescueTeam.findMany({
        where: { status: { not: "OFF_DUTY" } },
        select: { id: true, name: true, status: true, baseLocation: true },
        take: 200,
      })) as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status as TeamStatus,
        latitude: null,
        longitude: null,
        baseLocation: r.baseLocation ?? null,
      }));
    }, []),
    safe<GeoPointDTO[]>("historical", () => getGeoPoints(limit), []),
  ]);

  return { incidents, shelters, teams, historical, unavailable, generatedAt: new Date().toISOString() };
}
