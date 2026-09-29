import { useState } from "react";
import type { ResourceListItemDTO } from "@dmis/shared";
import { AlertTriangle, Boxes, PackageMinus, PackagePlus, Plus, Undo2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Button, Card, Dialog, EmptyState, ErrorState, LoadingState, Pagination, ResourceStatusBadge, SelectField, Table, TableContainer, TBody,
  TD, TH, THead, TR, TextField, useToast,
} from "../components/ui";
import { createResource, fetchResources, postResourceTransaction, type ResourceInput } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;
const canEdit = (role?: string) => role === "ADMIN" || role === "OFFICER";

const CATEGORIES = ["Water", "Food", "Medical", "Rescue Equipment", "Shelter Supplies", "Power", "Transport"];

/** Resource inventory (Chunk 12). Every quantity change goes through the
 *  transaction ledger, so stock history is always reconstructable. */
export function ResourcesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [transaction, setTransaction] = useState<{ item: ResourceListItemDTO; type: "RESTOCK" | "ALLOCATION" | "RETURN" } | null>(null);

  const list = useAsync(
    (signal) =>
      fetchResources(
        { q: search || undefined, category: category || undefined, lowStockOnly: lowStockOnly ? "true" : undefined, page, pageSize: PAGE_SIZE },
        signal
      ),
    [search, category, lowStockOnly, page]
  );

  const lowStock = list.status === "success" ? list.data.items.filter((r) => r.isLowStock).length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Relief stock: water, food, medical kits and rescue equipment. Allocations and restocks are recorded in a ledger, so the current quantity is always traceable."
        actions={
          canEdit(user?.role) ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add item
            </Button>
          ) : null
        }
      />

      {lowStock > 0 && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">{lowStock}</strong> item{lowStock === 1 ? " is" : "s are"} at or below the critical threshold on this page.
          </span>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1">
            <TextField
              label="Search"
              placeholder="Item name or category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <SelectField
            label="Category"
            className="w-48"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Stock"
            className="w-44"
            value={lowStockOnly ? "low" : ""}
            onChange={(e) => {
              setLowStockOnly(e.target.value === "low");
              setPage(1);
            }}
          >
            <option value="">All items</option>
            <option value="low">Low / out of stock only</option>
          </SelectField>
        </div>
      </Card>

      {list.status === "loading" && <LoadingState label="Loading inventory…" />}
      {list.status === "error" && <ErrorState title="Could not load resources" message={list.error.userMessage} onRetry={list.reload} />}

      {list.status === "success" && (
        <div className="space-y-3">
          {list.data.items.length === 0 ? (
            <EmptyState icon={Boxes} title="No resources yet" description="Add relief stock so response teams know what is available." />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <THead>
                    <tr>
                      <TH>Item</TH>
                      <TH>Category</TH>
                      <TH className="text-right">Available</TH>
                      <TH className="text-right">Allocated</TH>
                      <TH className="text-right">Threshold</TH>
                      <TH>Status</TH>
                      <TH>Location</TH>
                      {canEdit(user?.role) && <TH aria-label="Actions" />}
                    </tr>
                  </THead>
                  <TBody>
                    {list.data.items.map((r) => (
                      <TR key={r.id} className={r.status === "OUT_OF_STOCK" ? "bg-red-50/60" : r.status === "LOW_STOCK" ? "bg-amber-50/60" : undefined}>
                        <TD className="font-medium text-slate-900">{r.name}</TD>
                        <TD className="text-slate-700">{r.category}</TD>
                        <TD className="text-right tabular-nums font-semibold">
                          {r.quantityAvailable.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                        </TD>
                        <TD className="text-right tabular-nums text-slate-700">{r.allocated.toLocaleString("en-IN")}</TD>
                        <TD className="text-right tabular-nums text-slate-600">{r.lowStockThreshold.toLocaleString("en-IN")}</TD>
                        <TD>
                          <ResourceStatusBadge status={r.status} />
                        </TD>
                        <TD className="text-slate-600">{r.locationName ?? "Central store"}</TD>
                        {canEdit(user?.role) && (
                          <TD className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="secondary" onClick={() => setTransaction({ item: r, type: "ALLOCATION" })} title="Allocate stock">
                                <PackageMinus className="h-4 w-4" aria-hidden="true" /> Allocate
                              </Button>
                              <Button size="sm" onClick={() => setTransaction({ item: r, type: "RESTOCK" })} title="Restock">
                                <PackagePlus className="h-4 w-4" aria-hidden="true" /> Restock
                              </Button>
                            </div>
                          </TD>
                        )}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              <div className="-mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} label="items" />
              </div>
            </>
          )}
        </div>
      )}

      <CreateResourceDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          list.reload();
        }}
      />
      <TransactionDialog
        request={transaction}
        onClose={() => setTransaction(null)}
        onDone={(msg) => {
          setTransaction(null);
          push({ tone: "success", title: msg });
          list.reload();
        }}
      />
    </div>
  );
}

function CreateResourceDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<ResourceInput>({ name: "", category: "Water", unit: "litres", quantityAvailable: 0, lowStockThreshold: 0 });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await createResource(form);
      onCreated();
    } catch (err) {
      push({ tone: "error", title: "Could not add item", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a resource item"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!form.name}>
            Add item
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Item name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <TextField label="Unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} hint="e.g. litres, packs, kits" />
          <TextField
            label="Quantity in stock"
            type="number"
            min={0}
            value={form.quantityAvailable}
            onChange={(e) => setForm((f) => ({ ...f, quantityAvailable: Number(e.target.value) }))}
          />
          <TextField
            label="Critical threshold"
            type="number"
            min={0}
            value={form.lowStockThreshold}
            onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
            hint="Below this, the item is flagged low stock"
          />
        </div>
      </div>
    </Dialog>
  );
}

function TransactionDialog({
  request,
  onClose,
  onDone,
}: {
  request: { item: ResourceListItemDTO; type: "RESTOCK" | "ALLOCATION" | "RETURN" } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { push } = useToast();
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  if (request && seededFor !== request.item.id + request.type) {
    setSeededFor(request.item.id + request.type);
    setQuantity(0);
  }

  const verb = request?.type === "RESTOCK" ? "Restock" : request?.type === "ALLOCATION" ? "Allocate" : "Return";

  async function submit() {
    if (!request) return;
    setSaving(true);
    try {
      await postResourceTransaction(request.item.id, { type: request.type, quantity });
      onDone(`${verb} ${quantity} ${request.item.unit} of ${request.item.name}`);
    } catch (err) {
      push({ tone: "error", title: "Transaction failed", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!request}
      onClose={onClose}
      title={request ? `${verb} — ${request.item.name}` : ""}
      description={request ? `${request.item.quantityAvailable} ${request.item.unit} currently available` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={quantity < 1}>
            {request?.type === "RESTOCK" ? <PackagePlus className="h-4 w-4" aria-hidden="true" /> : request?.type === "ALLOCATION" ? (
              <PackageMinus className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            )}
            Confirm
          </Button>
        </>
      }
    >
      <TextField
        label={`Quantity (${request?.item.unit ?? ""})`}
        type="number"
        min={1}
        max={request?.type === "ALLOCATION" ? request?.item.quantityAvailable : undefined}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        hint="Recorded in the resource ledger with your name and the current time"
      />
    </Dialog>
  );
}
