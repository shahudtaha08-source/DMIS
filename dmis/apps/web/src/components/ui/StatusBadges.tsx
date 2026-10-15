import { AlertSeverity, AlertStatus, IncidentStatus, ResourceStatus, ShelterStatus, TeamStatus } from "@dmis/shared";
import { Badge, type Tone } from "./Badge";

/**
 * One badge per operational vocabulary (plan §30: "consistent status badges",
 * §41 emergency colour language). Colour is never the only signal — each badge
 * carries an icon and a text label, and the labels are humanised.
 */

const INCIDENT_STATUS: Record<IncidentStatus, { tone: Tone; label: string }> = {
  REPORTED: { tone: "warning", label: "Reported" },
  VERIFIED: { tone: "info", label: "Verified" },
  RESPONSE_ACTIVE: { tone: "critical", label: "Response active" },
  STABILIZED: { tone: "info", label: "Stabilized" },
  RESOLVED: { tone: "safe", label: "Resolved" },
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const { tone, label } = INCIDENT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const ALERT_SEVERITY: Record<AlertSeverity, { tone: Tone; label: string }> = {
  CRITICAL: { tone: "critical", label: "Critical" },
  WARNING: { tone: "warning", label: "Warning" },
  ADVISORY: { tone: "info", label: "Advisory" },
  INFO: { tone: "info", label: "Info" },
};

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { tone, label } = ALERT_SEVERITY[severity];
  return <Badge tone={tone}>{label}</Badge>;
}

const ALERT_STATUS: Record<AlertStatus, { tone: Tone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Draft" },
  PUBLISHED: { tone: "safe", label: "Published" },
  DEACTIVATED: { tone: "neutral", label: "Deactivated" },
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const { tone, label } = ALERT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const SHELTER_STATUS: Record<ShelterStatus, { tone: Tone; label: string }> = {
  OPEN: { tone: "safe", label: "Open" },
  FULL: { tone: "warning", label: "Full" },
  CLOSED: { tone: "neutral", label: "Closed" },
};

export function ShelterStatusBadge({ status }: { status: ShelterStatus }) {
  const { tone, label } = SHELTER_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const RESOURCE_STATUS: Record<ResourceStatus, { tone: Tone; label: string }> = {
  AVAILABLE: { tone: "safe", label: "Available" },
  LOW_STOCK: { tone: "warning", label: "Low stock" },
  OUT_OF_STOCK: { tone: "critical", label: "Out of stock" },
};

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  const { tone, label } = RESOURCE_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const TEAM_STATUS: Record<TeamStatus, { tone: Tone; label: string }> = {
  AVAILABLE: { tone: "safe", label: "Available" },
  DEPLOYED: { tone: "critical", label: "On mission" },
  OFF_DUTY: { tone: "neutral", label: "Off duty" },
};

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  const { tone, label } = TEAM_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Inline capacity/occupancy meter used by the Shelters list and details. */
export function OccupancyBar({ percent, tone }: { percent: number; tone?: Tone }) {
  const colour = tone ?? (percent >= 100 ? "bg-red-500" : percent >= 85 ? "bg-amber-500" : "bg-emerald-500");
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="presentation">
      <div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
