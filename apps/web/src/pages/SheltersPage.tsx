import { useState } from "react";
import { Building2, MapPin, Plus, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Button, Card, Dialog, EmptyState, ErrorState, LoadingState, OccupancyBar, Pagination, SelectField, ShelterStatusBadge, Table,
  TableContainer, TBody, TD, TH, THead, TR, TextField, useToast,
} from "../components/ui";
import { createShelter, fetchShelters, updateShelterOccupancy, type ShelterInput } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../auth/AuthContext";
import type { ShelterListItemDTO } from "@dmis/shared";

const PAGE_SIZE = 20;
const canEdit = (role?: string) => role === "ADMIN" || role === "OFFICER";

/** Shelters (Chunk 11). Occupancy maths is server-side; this view only
 *  presents it and lets an officer update the count. */
export function SheltersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [hasSpace, setHasSpace] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editingOccupancy, setEditingOccupancy] = useState<ShelterListItemDTO | null>(null);

  const list = useAsync(
    (signal) =>
      fetchShelters(
        { q: search || undefined, status: status || undefined, hasSpace: (hasSpace || undefined) as never, sort, page, pageSize: PAGE_SIZE },
        signal
      ),
    [search, status, hasSpace, sort, page]
  );

  const totals = list.status === "success"
    ? list.data.items.reduce(
        (acc, s) => ({ capacity: acc.capacity + s.capacity, occupancy: acc.occupancy + s.currentOccupancy, open: acc.open + (s.status === "OPEN" ? 1 : 0) }),
        { capacity: 0, occupancy: 0, open: 0 }
      )
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelters"
        description="Relief shelter capacity, current occupancy and available beds. Available = capacity − occupancy, calculated by the server so every client agrees."
        actions={
          canEdit(user?.role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add shelter
            </Button>
          ) : null
        }
      />

      {totals && (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile label="Open shelters" value={String(totals.open)} icon={Building2} />
          <SummaryTile label="Total capacity" value={totals.capacity.toLocaleString("en-IN")} icon={Users} />
          <SummaryTile
            label="Available beds"
            value={Math.max(0, totals.capacity - totals.occupancy).toLocaleString("en-IN")}
            icon={Users}
            tone={totals.capacity > 0 && (totals.capacity - totals.occupancy) / totals.capacity < 0.15 ? "critical" : "safe"}
          />
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <TextField
              label="Search"
              placeholder="Shelter name, address or contact…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <SelectField
            label="Status"
            className="w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="FULL">Full</option>
            <option value="CLOSED">Closed</option>
          </SelectField>
          <SelectField
            label="Availability"
            className="w-40"
            value={hasSpace}
            onChange={(e) => {
              setHasSpace(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All shelters</option>
            <option value="true">Beds available</option>
          </SelectField>
          <SelectField label="Sort by" className="w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name</option>
            <option value="availableBeds">Available beds</option>
            <option value="occupancy">Occupancy</option>
            <option value="capacity">Capacity</option>
          </SelectField>
        </div>
      </Card>

      {list.status === "loading" && <LoadingState label="Loading shelters…" />}
      {list.status === "error" && <ErrorState title="Could not load shelters" message={list.error.userMessage} onRetry={list.reload} />}

      {list.status === "success" && (
        <div className="space-y-3">
          {list.data.items.length === 0 ? (
            <EmptyState icon={Building2} title="No shelters registered" description="Add relief camps so responders can see live capacity." />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <THead>
                    <tr>
                      <TH>Shelter</TH>
                      <TH>Location</TH>
                      <TH className="text-right">Capacity</TH>
                      <TH className="text-right">Occupancy</TH>
                      <TH className="text-right">Available</TH>
                      <TH className="w-40">Fill level</TH>
                      <TH>Status</TH>
                      {canEdit(user?.role) && <TH aria-label="Actions" />}
                    </tr>
                  </THead>
                  <TBody>
                    {list.data.items.map((s) => (
                      <TR key={s.id}>
                        <TD>
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-600">{s.facilities.slice(0, 3).join(", ") || "No facilities listed"}</p>
                        </TD>
                        <TD className="max-w-56">
                          <span className="flex items-center gap-1 text-slate-700">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="truncate">{s.address}</span>
                          </span>
                        </TD>
                        <TD className="text-right tabular-nums">{s.capacity.toLocaleString("en-IN")}</TD>
                        <TD className="text-right tabular-nums">{s.currentOccupancy.toLocaleString("en-IN")}</TD>
                        <TD className="text-right tabular-nums font-semibold">
                          {s.availableBeds.toLocaleString("en-IN")}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            <OccupancyBar percent={s.occupancyPercent} />
                            <span className="w-9 text-right text-xs tabular-nums text-slate-600">{s.occupancyPercent}%</span>
                          </div>
                        </TD>
                        <TD>
                          <ShelterStatusBadge status={s.status} />
                        </TD>
                        {canEdit(user?.role) && (
                          <TD className="text-right">
                            <Button size="sm" variant="secondary" onClick={() => setEditingOccupancy(s)}>
                              Update
                            </Button>
                          </TD>
                        )}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              <div className="-mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} label="shelters" />
              </div>
            </>
          )}
        </div>
      )}

      <CreateShelterDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          list.reload();
        }}
      />
      <OccupancyDialog
        shelter={editingOccupancy}
        onClose={() => setEditingOccupancy(null)}
        onSaved={() => {
          setEditingOccupancy(null);
          list.reload();
        }}
      />
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon: typeof Users; tone?: "safe" | "critical" | "neutral" }) {
  const colour = tone === "safe" ? "text-emerald-700" : tone === "critical" ? "text-red-700" : "text-slate-900";
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colour}`}>{value}</p>
    </Card>
  );
}

function CreateShelterDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<ShelterInput>({
    name: "",
    address: "",
    latitude: 18.5204,
    longitude: 73.8567,
    capacity: 500,
    currentOccupancy: 0,
    facilities: [],
    managerContact: "",
  });
  const [facilities, setFacilities] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await createShelter({
        ...form,
        facilities: facilities.split(",").map((f) => f.trim()).filter(Boolean),
        managerContact: form.managerContact || null,
      });
      onCreated();
    } catch (err) {
      push({ tone: "error", title: "Could not add shelter", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a relief shelter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!form.name || !form.address}>
            Add shelter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Shelter name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <TextField label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Latitude"
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => setForm((f) => ({ ...f, latitude: Number(e.target.value) }))}
          />
          <TextField
            label="Longitude"
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => setForm((f) => ({ ...f, longitude: Number(e.target.value) }))}
          />
          <TextField
            label="Capacity"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
          />
          <TextField
            label="Current occupancy"
            type="number"
            min={0}
            value={form.currentOccupancy ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, currentOccupancy: Number(e.target.value) }))}
          />
        </div>
        <TextField
          label="Facilities (comma separated)"
          placeholder="Water, Medical, Cooking, Bedding"
          value={facilities}
          onChange={(e) => setFacilities(e.target.value)}
        />
        <TextField
          label="Manager contact"
          value={form.managerContact ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, managerContact: e.target.value }))}
        />
      </div>
    </Dialog>
  );
}

function OccupancyDialog({
  shelter,
  onClose,
  onSaved,
}: {
  shelter: ShelterListItemDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [value, setValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const current = shelter?.currentOccupancy ?? 0;

  // Re-seed the field whenever a different shelter is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (shelter && seededFor !== shelter.id) {
    setSeededFor(shelter.id);
    setValue(shelter.currentOccupancy);
  }

  async function submit() {
    if (!shelter) return;
    setSaving(true);
    try {
      await updateShelterOccupancy(shelter.id, value);
      push({ tone: "success", title: "Occupancy updated" });
      onSaved();
    } catch (err) {
      push({ tone: "error", title: "Could not update", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!shelter}
      onClose={onClose}
      title={shelter ? `Update occupancy — ${shelter.name}` : ""}
      description={shelter ? `Capacity ${shelter.capacity.toLocaleString("en-IN")} · currently ${current}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!!shelter && value > shelter.capacity}>
            Save
          </Button>
        </>
      }
    >
      <TextField
        label="Current occupancy"
        type="number"
        min={0}
        max={shelter?.capacity}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        hint={shelter && value > shelter.capacity ? "Occupancy cannot exceed capacity" : "Available beds are recalculated by the server"}
      />
    </Dialog>
  );
}
