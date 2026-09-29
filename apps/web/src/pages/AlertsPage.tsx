import { useState } from "react";
import { AlertSeverity, AlertStatus } from "@dmis/shared";
import { Bell, BellOff, Megaphone, Plus, Search, Send } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  AlertSeverityBadge, AlertStatusBadge, Button, Card, CardBody, Dialog, EmptyState, ErrorState, LoadingState, Pagination, SelectField,
  Table, TableContainer, TBody, TD, TH, THead, TR, TextField, TextareaField, useToast,
} from "../components/ui";
import { createAlert, deactivateAlert, fetchAlerts, publishAlert, type AlertInput } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;
const canEdit = (role?: string) => role === "ADMIN" || role === "OFFICER";

/** Alerts (Chunk 10). Publishing is instant and shared: a CRITICAL alert
 *  published here is the first thing the Flutter app shows. */
export function AlertsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const list = useAsync(
    (signal) => fetchAlerts({ status: status || undefined, severity: severity || undefined, page, pageSize: PAGE_SIZE }, signal),
    [status, severity, page]
  );

  async function publish(id: string) {
    try {
      await publishAlert(id);
      push({ tone: "success", title: "Alert published", message: "It is now live for every connected client." });
      list.reload();
    } catch (err) {
      push({ tone: "error", title: "Could not publish", message: (err as Error).message });
    }
  }

  async function deactivate(id: string) {
    try {
      await deactivateAlert(id);
      push({ tone: "info", title: "Alert deactivated" });
      list.reload();
    } catch (err) {
      push({ tone: "error", title: "Could not deactivate", message: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Publish warnings to the public and response teams. A published alert is visible on the dashboard and in the mobile app until it expires or is deactivated."
        actions={
          canEdit(user?.role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New alert
            </Button>
          ) : null
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Status"
            className="w-44"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.values(AlertStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Severity"
            className="w-44"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All severities</option>
            {Object.values(AlertSeverity).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </CardBody>
      </Card>

      {list.status === "loading" && <LoadingState label="Loading alerts…" />}
      {list.status === "error" && <ErrorState title="Could not load alerts" message={list.error.userMessage} onRetry={list.reload} />}

      {list.status === "success" && (
        <div className="space-y-3">
          {list.data.items.length === 0 ? (
            <EmptyState icon={Bell} title="No alerts yet" description="Publish a CRITICAL alert to warn the public and every connected responder." />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <THead>
                    <tr>
                      <TH>Alert</TH>
                      <TH>Severity</TH>
                      <TH>Status</TH>
                      <TH>Affected area</TH>
                      <TH>Valid until</TH>
                      <TH>Published by</TH>
                      {canEdit(user?.role) && <TH aria-label="Actions" />}
                    </tr>
                  </THead>
                  <TBody>
                    {list.data.items.map((a) => (
                      <TR key={a.id} className={a.severity === "CRITICAL" && a.status === "PUBLISHED" ? "bg-red-50/60" : undefined}>
                        <TD className="max-w-md">
                          <p className="font-medium text-slate-900">{a.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-600">{a.message}</p>
                        </TD>
                        <TD>
                          <AlertSeverityBadge severity={a.severity} />
                        </TD>
                        <TD>
                          <AlertStatusBadge status={a.status} />
                        </TD>
                        <TD className="text-slate-700">{a.affectedArea}</TD>
                        <TD className="whitespace-nowrap text-slate-600">{new Date(a.validUntil).toLocaleString("en-IN")}</TD>
                        <TD className="text-slate-600">{a.createdByName}</TD>
                        {canEdit(user?.role) && (
                          <TD className="text-right">
                            <div className="flex justify-end gap-1">
                              {a.status === "DRAFT" && (
                                <Button size="sm" onClick={() => publish(a.id)}>
                                  <Send className="h-4 w-4" aria-hidden="true" /> Publish
                                </Button>
                              )}
                              {a.status === "PUBLISHED" && (
                                <Button size="sm" variant="secondary" onClick={() => deactivate(a.id)}>
                                  <BellOff className="h-4 w-4" aria-hidden="true" /> Deactivate
                                </Button>
                              )}
                            </div>
                          </TD>
                        )}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              <div className="-mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} label="alerts" />
              </div>
            </>
          )}
        </div>
      )}

      <CreateAlertDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          push({ tone: "success", title: "Alert created" });
          list.reload();
        }}
      />
    </div>
  );
}

function CreateAlertDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<AlertInput>({
    title: "",
    message: "",
    severity: "CRITICAL",
    affectedArea: "",
    publish: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(publishNow: boolean) {
    setSaving(true);
    setError(null);
    try {
      await createAlert({ ...form, publish: publishNow });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      push({ tone: "error", title: "Could not create alert", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish an alert"
      description="Critical alerts are highlighted on the dashboard and pinned at the top of the mobile Alerts tab."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => submit(false)} loading={saving}>
            Save as draft
          </Button>
          <Button onClick={() => submit(true)} loading={saving} disabled={!form.title || !form.message || !form.affectedArea}>
            <Megaphone className="h-4 w-4" aria-hidden="true" /> Publish now
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
        <TextField
          label="Alert title"
          placeholder="CRITICAL FLOOD ALERT — Pune district"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <TextareaField
          label="Message"
          rows={4}
          placeholder="What is happening, who is affected and what the public should do…"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Severity"
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as AlertSeverity }))}
          >
            {Object.values(AlertSeverity).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Affected area"
            placeholder="Pune district, Maharashtra"
            value={form.affectedArea}
            onChange={(e) => setForm((f) => ({ ...f, affectedArea: e.target.value }))}
            required
          />
        </div>
        <TextField
          label="Valid until (optional)"
          type="datetime-local"
          hint="Defaults to 24 hours from now"
          onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value ? new Date(e.target.value).toISOString() : null }))}
        />
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Publishing also records an audit entry and creates an in-app notification for every active user account.
        </p>
      </div>
    </Dialog>
  );
}
