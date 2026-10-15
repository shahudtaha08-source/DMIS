import { useState } from "react";
import { IncidentStatus, Severity, type RescueTeamListItemDTO } from "@dmis/shared";
import { ArrowLeft, CircleCheck, LifeBuoy, MapPin, Pencil, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import {
  Badge, Button, Card, CardBody, CardHeader, Dialog, ErrorState, FullPageLoading, IncidentStatusBadge, NumberDisplay, SelectField,
  SeverityBadge, TextareaField, TextField, useToast,
} from "../components/ui";
import {
  assignIncidentTeam, fetchIncident, fetchTeams, updateIncident, updateIncidentStatus,
} from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../auth/AuthContext";

/** Ordered lifecycle. The API enforces forward-only movement; this is the UI
 *  affordance for the same rule. */
const FLOW: IncidentStatus[] = ["REPORTED", "VERIFIED", "RESPONSE_ACTIVE", "STABILIZED", "RESOLVED"];

const canEdit = (role?: string) => role === "ADMIN" || role === "OFFICER";

export function IncidentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const incident = useAsync((signal) => fetchIncident(id, signal), [id]);
  const teams = useAsync((signal) => fetchTeams({ pageSize: 100 }, signal), []);
  const [busy, setBusy] = useState(false);
  const [statusTarget, setStatusTarget] = useState<IncidentStatus | null>(null);
  const [editing, setEditing] = useState(false);

  if (incident.status === "loading") return <FullPageLoading label="Loading incident…" />;
  if (incident.status === "error") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/incidents")}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to incidents
        </Button>
        <ErrorState title="Incident unavailable" message={incident.error.userMessage} onRetry={incident.reload} />
      </div>
    );
  }

  const data = incident.data;
  const currentIndex = FLOW.indexOf(data.status);
  const nextStatus = currentIndex >= 0 && currentIndex < FLOW.length - 1 ? FLOW[currentIndex + 1] : null;
  const forwardOptions = FLOW.slice(currentIndex + 1);

  async function changeStatus(status: IncidentStatus, note?: string) {
    setBusy(true);
    try {
      await updateIncidentStatus(id, status, note);
      push({ tone: "success", title: `Incident is now ${status.replace(/_/g, " ").toLowerCase()}` });
      incident.reload();
    } catch (err) {
      push({ tone: "error", title: "Status not changed", message: (err as Error).message });
    } finally {
      setBusy(false);
      setStatusTarget(null);
    }
  }

  async function assign(teamId: string) {
    setBusy(true);
    try {
      await assignIncidentTeam(id, teamId || null);
      push({ tone: "success", title: teamId ? "Team assigned" : "Team unassigned" });
      incident.reload();
    } catch (err) {
      push({ tone: "error", title: "Assignment failed", message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/incidents")}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to incidents
      </Button>

      <PageHeader
        title={data.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <IncidentStatusBadge status={data.status} />
            <SeverityBadge severity={data.severity} />
            <Badge tone="neutral">{data.disasterType}</Badge>
            {data.alertCount > 0 && (
              <Badge tone="warning">{`${data.alertCount} alert${data.alertCount === 1 ? "" : "s"}`}</Badge>
            )}
          </span>
        }
        actions={
          canEdit(user?.role) ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
              </Button>
              {forwardOptions.length > 0 && (
                <>
                  {nextStatus && (
                    <Button onClick={() => setStatusTarget(nextStatus)} loading={busy}>
                      Advance to {nextStatus.replace(/_/g, " ").toLowerCase()}
                    </Button>
                  )}
                  {forwardOptions.length > 1 && (
                    <SelectField
                      label="Set status"
                      className="w-48"
                      value=""
                      onChange={(e) => e.target.value && setStatusTarget(e.target.value as IncidentStatus)}
                    >
                      <option value="">Jump to…</option>
                      {forwardOptions.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </SelectField>
                  )}
                </>
              )}
              {data.status === "RESOLVED" && <Badge tone="safe">Response complete</Badge>}
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Incident detail" description={`Reported by ${data.reportedByName} · ${new Date(data.createdAt).toLocaleString("en-IN")}`} />
            <CardBody className="space-y-4">
              <p className="whitespace-pre-line text-slate-700">{data.description}</p>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <Detail label="Location" value={data.location} />
                <Detail label="People affected" value={<NumberDisplay value={data.affectedPopulationEstimate} />} />
                <Detail label="Assigned team" value={data.assignedTeamName ?? "Unassigned"} />
                <Detail
                  label="Coordinates"
                  value={data.latitude !== null && data.longitude !== null ? `${data.latitude}, ${data.longitude}` : "Not recorded"}
                />
                <Detail label="Last updated" value={new Date(data.updatedAt).toLocaleString("en-IN")} />
                <Detail label="Resolved" value={data.resolvedAt ? new Date(data.resolvedAt).toLocaleString("en-IN") : "—"} />
              </dl>
              {(data.latitude !== null && data.longitude !== null) && (
                <a
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
                  href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=13/${data.latitude}/${data.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Open in OpenStreetMap
                </a>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Response timeline" description="Every change is recorded against this incident." />
            <CardBody>
              {data.timeline.length === 0 ? (
                <p className="text-sm text-slate-600">No activity recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {data.timeline.map((e) => (
                    <li key={e.id} className="relative flex gap-3 border-l-2 border-slate-200 pl-4">
                      <span
                        className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ring-2 ring-white ${
                          e.kind === "status" ? "bg-blue-500" : e.kind === "assigned" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{e.label}</p>
                        <p className="text-xs text-slate-600">
                          {new Date(e.at).toLocaleString("en-IN")}
                          {e.actor ? ` · ${e.actor}` : ""}
                          {e.detail ? ` · ${e.detail}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Response actions" description="Advancing the status updates the mobile app immediately." />
            <CardBody className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Lifecycle</p>
                <ol className="mt-2 space-y-1.5">
                  {FLOW.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          i < currentIndex ? "bg-emerald-500" : i === currentIndex ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      />
                      <span className={i === currentIndex ? "font-semibold text-slate-900" : "text-slate-600"}>
                        {s.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              {data.status === "RESOLVED" ? (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CircleCheck className="h-4 w-4" aria-hidden="true" /> This incident is resolved.
                </p>
              ) : (
                nextStatus && canEdit(user?.role) && (
                  <Button className="w-full" onClick={() => setStatusTarget(nextStatus)} loading={busy}>
                    Advance to {nextStatus.replace(/_/g, " ").toLowerCase()}
                  </Button>
                )
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assigned rescue team" description="Assigning a team also marks the incident as owned by that team." />
            <CardBody className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-slate-800">
                <LifeBuoy className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {data.assignedTeamName ?? "No team assigned"}
              </p>
              {canEdit(user?.role) && (
                <SelectField
                  label="Assign team"
                  value={data.assignedTeamId ?? ""}
                  disabled={busy || teams.status === "loading"}
                  onChange={(e) => assign(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {teams.status === "success" &&
                    teams.data.items.map((t: RescueTeamListItemDTO) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.specialization}
                      </option>
                    ))}
                </SelectField>
              )}
              <Link to="/teams" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
                <Users className="h-4 w-4" aria-hidden="true" /> Manage teams
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Escalate" description="Publish a public alert for this incident." />
            <CardBody>
              <Link to="/alerts" className="text-sm font-medium text-blue-700 hover:underline">
                Go to Alerts and publish a {data.severity.toLowerCase()} alert →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmStatusDialog
        status={statusTarget}
        onCancel={() => setStatusTarget(null)}
        onConfirm={(s) => changeStatus(s)}
      />
      <EditIncidentDialog
        incidentId={id}
        open={editing}
        onClose={() => setEditing(false)}
        initial={{
          title: data.title,
          description: data.description,
          location: data.location,
          severity: data.severity,
          affectedPopulationEstimate: data.affectedPopulationEstimate,
        }}
        onSaved={() => {
          setEditing(false);
          push({ tone: "success", title: "Incident updated" });
          incident.reload();
        }}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ConfirmStatusDialog({
  status,
  onCancel,
  onConfirm,
}: {
  status: IncidentStatus | null;
  onCancel: () => void;
  onConfirm: (s: IncidentStatus, note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={!!status}
      onClose={() => {
        setNote("");
        onCancel();
      }}
      title={status ? `Set status to ${status.replace(/_/g, " ").toLowerCase()}` : ""}
      description="This is recorded on the incident timeline and shown immediately on the mobile app."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setNote("");
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (status) onConfirm(status, note);
              setNote("");
            }}
          >
            Confirm
          </Button>
        </>
      }
    >
      <TextareaField label="Note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Two teams on site, evacuation under way" />
    </Dialog>
  );
}

function EditIncidentDialog({
  incidentId,
  open,
  onClose,
  initial,
  onSaved,
}: {
  incidentId: string;
  open: boolean;
  onClose: () => void;
  initial: { title: string; description: string; location: string; severity: Severity; affectedPopulationEstimate: number | null };
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateIncident(incidentId, form);
      onSaved();
    } catch (err) {
      onClose();
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit incident"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <TextField label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <SelectField label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}>
          {Object.values(Severity).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <TextField
          label="People affected"
          type="number"
          value={form.affectedPopulationEstimate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, affectedPopulationEstimate: e.target.value ? Number(e.target.value) : null }))}
        />
        <TextareaField label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
    </Dialog>
  );
}
