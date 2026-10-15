import type { DashboardSummaryDTO } from "@dmis/shared";
import { apiRequest } from "../../lib/api";

export async function fetchDashboardSummary(signal: AbortSignal): Promise<DashboardSummaryDTO> {
  const { data } = await apiRequest<DashboardSummaryDTO>("/dashboard/summary", { signal });
  return data;
}
