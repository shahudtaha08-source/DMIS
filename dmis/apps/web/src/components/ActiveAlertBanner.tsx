import { useState } from "react";
import { Link } from "react-router-dom";
import { Siren, X } from "lucide-react";
import type { AlertListItemDTO, AlertSeverity } from "@dmis/shared";
import { Button } from "./ui";
import { fetchActiveAlerts } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";

const STYLE: Record<AlertSeverity, { box: string; dot: string }> = {
  CRITICAL: { box: "border-red-400 bg-red-50 text-red-900", dot: "bg-red-600" },
  WARNING: { box: "border-orange-300 bg-orange-50 text-orange-900", dot: "bg-orange-500" },
  ADVISORY: { box: "border-blue-300 bg-blue-50 text-blue-900", dot: "bg-blue-500" },
  INFO: { box: "border-cyan-300 bg-cyan-50 text-cyan-900", dot: "bg-cyan-500" },
};

const LABEL: Record<AlertSeverity, string> = {
  CRITICAL: "Critical alert",
  WARNING: "Warning",
  ADVISORY: "Advisory",
  INFO: "Information",
};

/** Active alert banner (Chunk 14). Dismissal is per-session, not persisted:
 *  a dismissed banner must never hide a genuinely new alert on reload. */
export function ActiveAlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const alerts = useAsync((signal) => fetchActiveAlerts(3, signal), []);

  if (dismissed || alerts.status !== "success" || alerts.data.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Active alerts">
      {alerts.data.map((a, i) => (
        <AlertRow key={a.id} alert={a} onDismiss={i === 0 ? () => setDismissed(true) : undefined} />
      ))}
    </div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: AlertListItemDTO; onDismiss?: () => void }) {
  const style = STYLE[alert.severity] ?? STYLE.INFO;
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.box}`}>
      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
      <Siren className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {LABEL[alert.severity] ?? alert.severity}: {alert.title}
        </p>
        <p className="mt-0.5 text-sm opacity-90">{alert.message}</p>
        <p className="mt-0.5 text-xs opacity-75">
          Area: {alert.affectedArea} · valid until {new Date(alert.validUntil).toLocaleString("en-IN")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {alert.relatedIncidentId && (
          <Link
            to={`/incidents/${alert.relatedIncidentId}`}
            className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-2"
          >
            View incident
          </Link>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss alert banner">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
