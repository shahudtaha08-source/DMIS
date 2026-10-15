import { TeamStatus, type PaginationMeta, type RescueTeamListItemDTO } from "@dmis/shared";
import { AppError } from "../../lib/AppError";
import { recordAudit } from "../../lib/audit";
import { pageMeta, resolvePage } from "../../lib/pagination";
import { getTeamRepository } from "./repository";
import type { CreateTeamInput, TeamQuery } from "./validation";

const MODULE = "teams";

export async function listTeams(query: TeamQuery): Promise<{ items: RescueTeamListItemDTO[]; meta: PaginationMeta }> {
  const page = resolvePage(query);
  const result = await getTeamRepository().list({ ...query, ...page });
  return { items: result.items, meta: pageMeta(page, result.total) };
}

export async function getTeam(id: string): Promise<RescueTeamListItemDTO> {
  const team = await getTeamRepository().findById(id);
  if (!team) throw AppError.notFound("Rescue team not found.", MODULE);
  return team;
}

export async function createTeam(input: CreateTeamInput, userId: string) {
  const team = await getTeamRepository().create(input);
  recordAudit({ userId, action: "created", entityType: "RescueTeam", entityId: team.id, metadata: { label: `Team created: ${team.name}` } });
  return team;
}

export async function updateTeam(id: string, patch: Record<string, unknown>, userId: string) {
  const team = await getTeamRepository().update(id, patch);
  recordAudit({ userId, action: "updated", entityType: "RescueTeam", entityId: id, metadata: { label: `Team updated: ${team.name}` } });
  return team;
}

export async function setTeamStatus(id: string, status: TeamStatus, userId: string) {
  const team = await getTeamRepository().setStatus(id, status);
  recordAudit({
    userId,
    action: "updated",
    entityType: "RescueTeam",
    entityId: id,
    metadata: { label: `Team status → ${status.replace(/_/g, " ")}`, detail: team.name },
  });
  return team;
}
