/**
 * Single source of truth for navigation + module readiness. Adding a module's
 * page means flipping `status` to "live" and registering its page in App.tsx.
 * NOTE: the plan schedules no chunk for Emergency Contacts or Settings; they
 * are tentatively listed with Chunk 16 and should be confirmed.
 */
import type { ComponentType } from "react";
import {
  BarChart3, Bell, Building2, ClipboardList, History, HeartHandshake, LayoutDashboard, LifeBuoy, Map as MapIcon,
  Package, Phone, ScrollText, Settings, Siren, type LucideProps,
} from "lucide-react";
import { UserRole } from "@dmis/shared";

export type ModuleId =
  | "dashboard" | "map" | "incidents" | "alerts" | "shelters" | "resources" | "teams" | "volunteers"
  | "victims" | "historical" | "analytics" | "contacts" | "audit-logs" | "settings";

export type GroupId = "overview" | "operations" | "intelligence" | "directory" | "system";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  path: string;
  group: GroupId;
  icon: ComponentType<LucideProps>;
  description: string;
  status: "live" | "planned";
  chunk: number;
  roles?: UserRole[];
}

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "operations", label: "Operations" },
  { id: "intelligence", label: "Intelligence" },
  { id: "directory", label: "Directory" },
  { id: "system", label: "System" },
];

export const MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", path: "/", group: "overview", icon: LayoutDashboard, status: "live", chunk: 6, description: "Operational overview: active incidents, affected population, teams, shelter capacity and resources." },
  { id: "map", label: "Live Map", path: "/map", group: "overview", icon: MapIcon, status: "live", chunk: 9, description: "Historical disasters, current incidents, shelters and teams on one map." },
  { id: "incidents", label: "Incidents", path: "/incidents", group: "operations", icon: Siren, status: "live", chunk: 8, description: "Report, verify, respond to and resolve current incidents." },
  { id: "alerts", label: "Alerts", path: "/alerts", group: "operations", icon: Bell, status: "live", chunk: 10, description: "Publish and manage public alerts; view notifications." },
  { id: "shelters", label: "Shelters", path: "/shelters", group: "operations", icon: Building2, status: "live", chunk: 11, description: "Shelter capacity, occupancy, facilities and availability." },
  { id: "resources", label: "Resources", path: "/resources", group: "operations", icon: Package, status: "live", chunk: 12, description: "Inventory, allocation, restocking and low-stock warnings." },
  { id: "teams", label: "Rescue Teams", path: "/teams", group: "operations", icon: LifeBuoy, status: "live", chunk: 13, description: "Rescue teams, specialisations, status and assignments." },
  { id: "volunteers", label: "Volunteers", path: "/volunteers", group: "operations", icon: HeartHandshake, status: "planned", chunk: 13, description: "Volunteer registration, availability and task assignment." },
  { id: "victims", label: "Victims & Reports", path: "/victims", group: "operations", icon: ClipboardList, status: "planned", chunk: 14, description: "Victim and missing-person reports with status tracking." },
  { id: "historical", label: "Historical Disasters", path: "/historical", group: "intelligence", icon: History, status: "live", chunk: 7, description: "Search and explore 783 recorded disasters in India (1900–2024)." },
  { id: "analytics", label: "Analytics", path: "/analytics", group: "intelligence", icon: BarChart3, status: "live", chunk: 15, roles: [UserRole.ADMIN, UserRole.OFFICER], description: "Trends, geography, response metrics and utilisation." },
  { id: "contacts", label: "Emergency Contacts", path: "/contacts", group: "directory", icon: Phone, status: "planned", chunk: 16, description: "Key emergency and district contacts." },
  { id: "audit-logs", label: "Audit Logs", path: "/audit-logs", group: "system", icon: ScrollText, status: "planned", chunk: 16, roles: [UserRole.ADMIN], description: "Who changed what, and when." },
  { id: "settings", label: "Settings", path: "/settings", group: "system", icon: Settings, status: "planned", chunk: 16, description: "Your profile and preferences." },
];

export function moduleForPath(pathname: string): ModuleDef | undefined {
  if (pathname === "/") return MODULES[0];
  return MODULES.find((m) => m.path !== "/" && (pathname === m.path || pathname.startsWith(m.path + "/")));
}
