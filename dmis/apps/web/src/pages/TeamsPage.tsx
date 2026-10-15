import { useState } from "react";
import { TeamStatus } from "@dmis/shared";
import { LifeBuoy, MapPin } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Card, EmptyState, ErrorState, LoadingState, SelectField, Table, TableContainer, TBody, TD, TH, THead, TR, TextField, TeamStatusBadge, useToast,
} from "../components/ui";
import { fetchTeams, setTeamStatus } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../auth/AuthContext";

/** Rescue teams (Chunk 13). Status is editable here; assignment to an incident
 *  happens on the incident detail page, where the response context is. */
export function TeamsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const canEdit = user?.role === "ADMIN" || user?.role === "OFFICER";

  const list = useAsync((signal) => fetchTeams({ q: search || undefined, status: status || undefined, pageSize: 100 }, signal), [search, status]);

  async function change(id: string, next: TeamStatus) {
    setBusy(id);
    try {
      await setTeamStatus(id, next);
      push({ tone: "success", title: "Team status updated" });
      list.reload();
    } catch (err) {
      push({ tone: "error", title: "Could not update team", message: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rescue Teams"
        description="Available response units, their specialisation and current assignment. Assign a team to an incident from the incident detail page."
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <TextField
              label="Search teams"
              placeholder="Name, specialisation or base…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SelectField label="Status" className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.values(TeamStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      {list.status === "loading" && <LoadingState label="Loading teams…" />}
      {list.status === "error" && <ErrorState title="Could not load teams" message={list.error.userMessage} onRetry={list.reload} />}

      {list.status === "success" &&
        (list.data.items.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No rescue teams" description="Register response units so incidents can be assigned quickly." />
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <tr>
                  <TH>Team</TH>
                  <TH>Specialisation</TH>
                  <TH>Base location</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Active incidents</TH>
                  <TH>Current assignment</TH>
                  {canEdit && <TH aria-label="Actions" />}
                </tr>
              </THead>
              <TBody>
                {list.data.items.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium text-slate-900">{t.name}</TD>
                    <TD className="text-slate-700">{t.specialization}</TD>
                    <TD className="text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        {t.baseLocation ?? "—"}
                      </span>
                    </TD>
                    <TD>
                      <TeamStatusBadge status={t.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{t.activeIncidents}</TD>
                    <TD className="text-slate-700">{t.currentIncidentTitle ?? <span className="text-slate-400">None</span>}</TD>
                    {canEdit && (
                      <TD className="text-right">
                        <SelectField
                          label="Change status"
                          className="w-36"
                          value={t.status}
                          disabled={busy === t.id}
                          onChange={(e) => change(t.id, e.target.value as TeamStatus)}
                        >
                          {Object.values(TeamStatus).map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </SelectField>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ))}
    </div>
  );
}
