import { useState } from "react";
import { IncidentStatus, Severity } from "@dmis/shared";
import { Plus, RotateCcw, Search, Siren, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Button, Card, CardBody, Dialog, EmptyState, ErrorState, IncidentStatusBadge, LoadingState, NumberDisplay, Pagination, SelectField,
  SeverityBadge, Table, TableContainer, TBody, TD, TH, THead, TR, TextField, TextareaField, useToast,
} from "../components/ui";
import {
  createIncident, fetchIncidents, type IncidentFilters, type IncidentInput,
} from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;
const canEdit = (role?: string) => role === "ADMIN" || role === "OFFICER";

const DISASTER_TYPES = [
  "Flood", "Cyclone", "Earthquake", "Landslide", "Drought", "Wildfire", "Floods", "Strom (Cyclone)",
  "Droughts", "Earthquake", "Epidemic", "Landslide", "Forest fire", "Avalanche", "Chemical",
];

const EMPTY: IncidentFilters = { page: 1, pageSize: PAGE_SIZE, sort: "createdAt", order: "desc" };

/**
 * Incident Management (Chunk 8) — list + report form. The full lifecycle
 * (status transitions, team assignment, timeline) lives on the detail page.
 */
export function IncidentsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [filters, setFilters] = useState<IncidentFilters>(EMPTY);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const page = useAsync((signal) => fetchIncidents(filters, signal), [filters]);

  function patch(next: Partial<IncidentFilters>) {
    setFilters((f) => ({ ...f, ...next, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Management"
        description="Report, verify, respond to and resolve live incidents. Every change is written to the incident timeline and is visible immediately in the mobile app."
        actions={
          canEdit(user?.role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Report incident
            </Button>
          ) : null
        }
      />

      <Card>
        <CardBody className="space-y-3">
          <form
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ q: search.trim() || undefined });
            }}
          >
            <div className="flex-1">
              <TextField label="Search incidents" placeholder="Title, location, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <SelectField
              label="Status"
              className="lg:w-48"
              value={filters.status ?? ""}
              onChange={(e) => patch({ status: e.target.value || undefined })}
            >
              <option value="">All statuses</option>
              {Object.values(IncidentStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Severity"
              className="lg:w-40"
              value={filters.severity ?? ""}
              onChange={(e) => patch({ severity: e.target.value || undefined })}
            >
              <option value="">All severities</option>
              {Object.values(Severity).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SelectField label="Quick filter" className="lg:w-44" value={filters.active ?? ""} onChange={(e) => patch({ active: (e.target.value || undefined) as never })}>
              <option value="">Everything</option>
              <option value="true">Active only</option>
              <option value="false">Resolved only</option>
            </SelectField>
            <Button type="submit" className="lg:mb-0">
              <Search className="h-4 w-4" aria-hidden="true" /> Search
            </Button>
            {(filters.q || filters.status || filters.severity || filters.active) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setFilters(EMPTY);
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear
              </Button>
            )}
          </form>
        </CardBody>
      </Card>

      {page.status === "loading" && <LoadingState label="Loading incidents…" />}
      {page.status === "error" && <ErrorState title="Could not load incidents" message={page.error.userMessage} onRetry={page.reload} />}

      {page.status === "success" && (
        <div className="space-y-3">
          {page.data.items.length === 0 ? (
            <EmptyState
              icon={Siren}
              title="No incidents reported yet"
              description="Incidents you report appear here and immediately in the Flutter app for field responders."
              action={
                canEdit(user?.role) ? (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Report the first incident
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <THead>
                    <tr>
                      <TH>ID</TH>
                      <TH>Disaster</TH>
                      <TH>Location</TH>
                      <TH>Severity</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Affected</TH>
                      <TH>Reported</TH>
                      <TH>Team</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {page.data.items.map((i) => (
                      <TR key={i.id}>
                        <TD className="font-mono text-xs text-slate-500">{i.id.slice(-6).toUpperCase()}</TD>
                        <TD>
                          <Link to={`/incidents/${i.id}`} className="font-medium text-blue-700 hover:underline">
                            {i.title}
                          </Link>
                          <p className="text-xs text-slate-600">{i.disasterType}</p>
                        </TD>
                        <TD className="max-w-48">
                          <span className="block truncate text-slate-700">{i.location}</span>
                        </TD>
                        <TD>
                          <SeverityBadge severity={i.severity} />
                        </TD>
                        <TD>
                          <IncidentStatusBadge status={i.status} />
                        </TD>
                        <TD className="text-right tabular-nums">
                          <NumberDisplay value={i.affectedPopulationEstimate} />
                        </TD>
                        <TD className="whitespace-nowrap text-slate-600">{new Date(i.createdAt).toLocaleString("en-IN")}</TD>
                        <TD className="text-slate-700">{i.assignedTeamName ?? <span className="text-slate-400">Unassigned</span>}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              <div className="-mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Pagination
                  page={filters.page ?? 1}
                  pageSize={PAGE_SIZE}
                  total={page.data.total}
                  onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
                  label="incidents"
                />
              </div>
            </>
          )}
        </div>
      )}

      <CreateIncidentDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          push({ tone: "success", title: "Incident reported", message: "It is now visible to every connected client, including the mobile app." });
          page.reload();
        }}
      />
    </div>
  );
}

function CreateIncidentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<IncidentInput>({
    title: "",
    disasterType: "Flood",
    location: "",
    description: "",
    severity: "CRITICAL",
    affectedPopulationEstimate: null,
    latitude: null,
    longitude: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createIncident({
        ...form,
        affectedPopulationEstimate: form.affectedPopulationEstimate ?? null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        title: form.title?.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      push({ tone: "error", title: "Could not report incident", message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report a new incident"
      description="Create the incident record. It starts as REPORTED and can be advanced through the response workflow immediately afterwards."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!form.location || !form.description}>
            <Siren className="h-4 w-4" aria-hidden="true" /> Report incident
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Disaster type"
            list="dmis-disaster-types"
            value={form.disasterType}
            onChange={(e) => setForm((f) => ({ ...f, disasterType: e.target.value }))}
            required
          />
          <datalist id="dmis-disaster-types">
            {DISASTER_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <TextField
            label="Location"
            placeholder="e.g. Sangliwadi, Pune, Maharashtra"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            required
          />
          <SelectField label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}>
            {Object.values(Severity).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <TextField
            label="People affected (estimate)"
            type="number"
            min={0}
            placeholder="4800"
            value={form.affectedPopulationEstimate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, affectedPopulationEstimate: e.target.value ? Number(e.target.value) : null }))}
            hint="Feeds the affected-population KPI and the mobile dashboard"
          />
          <TextField
            label="Latitude"
            type="number"
            step="any"
            placeholder="18.5204"
            value={form.latitude ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : null }))}
            hint="Optional — pins the incident on the live map"
          />
          <TextField
            label="Longitude"
            type="number"
            step="any"
            placeholder="73.8567"
            value={form.longitude ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : null }))}
          />
        </div>
        <TextareaField
          label="Description"
          rows={4}
          placeholder="What happened, who is affected, what response is required…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
        <TextField
          label="Incident title (optional)"
          placeholder={`Defaults to “${form.disasterType} — ${form.location || "location"}”`}
          value={form.title ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Publishing an alert is a separate step in the Alerts module, so a report never pushes a public message by accident.
        </p>
      </div>
    </Dialog>
  );
}
