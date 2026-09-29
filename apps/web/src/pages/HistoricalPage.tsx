import { useMemo, useState } from "react";
import type { HistoricalDisasterListItemDTO } from "@dmis/shared";
import { History, MapPin, RotateCcw, Search, SlidersHorizontal, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Button, Card, CardBody, EmptyState, ErrorState, LoadingState, Pagination, SelectField, Table, TableContainer, TBody, TD, TH, THead, TR, TextField,
} from "../components/ui";
import {
  fetchHistoricalDisasters, fetchHistoricalFilterOptions, fetchHistoricalRecord, fetchHistoricalStats, type HistoricalFilters,
} from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { Dialog } from "../components/ui";
import { NumberDisplay } from "../components/ui";

const PAGE_SIZE = 20;

const SORTS: { value: string; label: string }[] = [
  { value: "startYear", label: "Year" },
  { value: "totalAffected", label: "People affected" },
  { value: "totalDeaths", label: "Deaths" },
  { value: "disasterType", label: "Disaster type" },
  { value: "disNo", label: "Record ID" },
];

const EMPTY: HistoricalFilters = { page: 1, pageSize: PAGE_SIZE, sort: "startYear", order: "desc" };

/**
 * Historical Disaster Explorer (Chunk 7) — read-only intelligence over the
 * 783 imported records. Every filter maps to one query parameter, so the
 * filter state in the URL and the database predicate never drift apart.
 */
export function HistoricalPage() {
  const [filters, setFilters] = useState<HistoricalFilters>(EMPTY);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HistoricalDisasterListItemDTO | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const options = useAsync(fetchHistoricalFilterOptions, []);
  const stats = useAsync(fetchHistoricalStats, []);
  const page = useAsync((signal) => fetchHistoricalDisasters(filters, signal), [filters]);
  const record = useAsync((signal) => fetchHistoricalRecord(selected!.disNo, signal), [selected?.disNo]);

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => v !== undefined && v !== "" && !["page", "pageSize", "sort", "order"].includes(k)).length,
    [filters]
  );

  function patch(next: Partial<HistoricalFilters>) {
    setFilters((f) => ({ ...f, ...next, page: 1 }));
  }

  function reset() {
    setSearch("");
    setFilters(EMPTY);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Disaster Explorer"
        description={
          <>
            {stats.status === "success" ? (
              <>
                <strong className="font-semibold text-slate-800">
                  {stats.data.total !== null ? stats.data.total.toLocaleString("en-IN") : "—"}
                </strong>{" "}
                recorded disasters in India (1900–2024) ·{" "}
                <NumberDisplay value={stats.data.totalDeaths} />{" "}
                recorded deaths · <NumberDisplay value={stats.data.totalAffected} /> people affected
              </>
            ) : (
              "Recorded disasters in India (1900–2024)."
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardBody className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ q: search.trim() || undefined });
            }}
          >
            <div className="flex-1">
              <TextField
                label="Search the archive"
                placeholder="Event name, location, record ID or disaster type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="sm:mb-0">
                <Search className="h-4 w-4" aria-hidden="true" /> Search
              </Button>
            </div>
          </form>

          {showFilters && options.status === "success" && (
            <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField label="Disaster type" value={filters.type ?? ""} onChange={(e) => patch({ type: e.target.value || undefined, subtype: undefined })}>
                <option value="">All types</option>
                {options.data.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.count})
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Disaster subtype"
                value={filters.subtype ?? ""}
                onChange={(e) => patch({ subtype: e.target.value || undefined })}
              >
                <option value="">All subtypes</option>
                {options.data.subtypes
                  .filter(() => !filters.type || options.data.types.find((t) => t.value === filters.type))
                  .slice(0, 60)
                  .map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value} ({s.count})
                    </option>
                  ))}
              </SelectField>
              <TextField
                label="Year from"
                type="number"
                min={options.data.yearMin ?? 1000}
                max={options.data.yearMax ?? 3000}
                value={filters.yearFrom ?? ""}
                onChange={(e) => patch({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
              />
              <TextField
                label="Year to"
                type="number"
                min={options.data.yearMin ?? 1000}
                max={options.data.yearMax ?? 3000}
                value={filters.yearTo ?? ""}
                onChange={(e) => patch({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
              />
              <SelectField label="Location contains" value={filters.location ?? ""} onChange={(e) => patch({ location: e.target.value || undefined })}>
                <option value="">Anywhere</option>
                {options.data.locations.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.value} ({l.count})
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Minimum deaths"
                type="number"
                min={0}
                value={filters.minDeaths ?? ""}
                onChange={(e) => patch({ minDeaths: e.target.value ? Number(e.target.value) : undefined })}
              />
              <SelectField
                label="Mapped records"
                value={filters.hasCoordinates ? "true" : ""}
                onChange={(e) => patch({ hasCoordinates: e.target.value === "true" ? true : undefined })}
                hint={`${options.data.withCoordinates} of ${options.data.total ?? 0} records have coordinates`}
              >
                <option value="">All records</option>
                <option value="true">Only records with coordinates</option>
              </SelectField>
            </div>
          )}

          {options.status === "error" && (
            <p className="text-sm text-amber-800">Filter options are unavailable — you can still search and sort.</p>
          )}
        </CardBody>
      </Card>

      {page.status === "loading" && <LoadingState label="Searching the archive…" />}
      {page.status === "error" && <ErrorState title="Could not load historical records" message={page.error.userMessage} onRetry={page.reload} />}

      {page.status === "success" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {page.data.total.toLocaleString("en-IN")} matching record{page.data.total === 1 ? "" : "s"}
            </p>
            <div className="flex items-end gap-2">
              <SelectField
                label="Sort by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
                className="w-48"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
              <Button
                variant="secondary"
                size="sm"
                className="mb-1"
                onClick={() => setFilters((f) => ({ ...f, order: f.order === "asc" ? "desc" : "asc", page: 1 }))}
              >
                {filters.order === "asc" ? "Ascending" : "Descending"}
              </Button>
            </div>
          </div>

          {page.data.items.length === 0 ? (
            <EmptyState
              icon={History}
              title="No records match these filters"
              description="Try widening the year range, clearing the type filter, or searching for a state name such as “Maharashtra”."
              action={
                <Button variant="secondary" onClick={reset}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <THead>
                    <tr>
                      <TH>Record</TH>
                      <TH>Disaster</TH>
                      <TH>Location</TH>
                      <TH>Year</TH>
                      <TH className="text-right">Affected</TH>
                      <TH className="text-right">Deaths</TH>
                      <TH aria-label="Actions" />
                    </tr>
                  </THead>
                  <TBody>
                    {page.data.items.map((r) => (
                      <TR key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                        <TD className="font-mono text-xs text-slate-500">{r.disNo}</TD>
                        <TD>
                          <p className="font-medium text-slate-900">{r.eventName || r.disasterType}</p>
                          <p className="text-xs text-slate-600">
                            {r.disasterType}
                            {r.disasterSubtype ? ` · ${r.disasterSubtype}` : ""}
                          </p>
                        </TD>
                        <TD className="max-w-56">
                          <span className="flex items-center gap-1 truncate text-slate-700">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                            {r.location ?? "—"}
                          </span>
                        </TD>
                        <TD className="font-medium">{r.startYear}</TD>
                        <TD className="text-right tabular-nums">
                          <NumberDisplay value={r.totalAffected} />
                        </TD>
                        <TD className="text-right tabular-nums">
                          <NumberDisplay value={r.totalDeaths} />
                        </TD>
                        <TD className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}
                          >
                            Details
                          </Button>
                        </TD>
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
                  label="records"
                />
              </div>
            </>
          )}
        </div>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.eventName || selected?.disasterType || "Historical record"}
        description={selected ? `${selected.disasterType}${selected.disasterSubtype ? ` · ${selected.disasterSubtype}` : ""} — ${selected.startYear}` : undefined}
      >
        {record.status === "loading" && <LoadingState label="Loading record…" />}
        {record.status === "error" && <ErrorState title="Record unavailable" message={record.error.userMessage} onRetry={record.reload} />}
        {record.status === "success" && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Record ID" value={record.data.disNo} mono />
            <Field label="Year" value={String(record.data.startYear)} />
            <Field label="Classification" value={record.data.classificationKey} />
            <Field label="Group" value={record.data.disasterGroup} />
            <Field label="Subgroup" value={record.data.disasterSubgroup} />
            <Field label="ISO / Region" value={`${record.data.iso} · ${record.data.region}`} />
            <Field label="Location" value={record.data.location ?? "Not recorded"} />
            <Field label="People affected" value={record.data.totalAffected?.toLocaleString("en-IN") ?? "—"} />
            <Field label="Deaths" value={record.data.totalDeaths?.toLocaleString("en-IN") ?? "—"} />
            <Field label="Injured" value={record.data.noInjured?.toLocaleString("en-IN") ?? "—"} />
            <Field label="Homeless" value={record.data.noHomeless?.toLocaleString("en-IN") ?? "—"} />
            <Field
              label="Total damage (USD 000)"
              value={record.data.totalDamageUsd000 !== null ? record.data.totalDamageUsd000.toLocaleString("en-IN") : "—"}
            />
            <Field
              label="Coordinates"
              value={
                record.data.latitude !== null && record.data.longitude !== null
                  ? `${record.data.latitude.toFixed(4)}, ${record.data.longitude.toFixed(4)}`
                  : "Not recorded in source"
              }
            />
            <Field label="Appeal / Declaration" value={`${record.data.appeal ? "Yes" : "No"} / ${record.data.declaration ? "Yes" : "No"}`} />
            {record.data.magnitude !== null && <Field label="Magnitude" value={`${record.data.magnitude} ${record.data.magnitudeScale ?? ""}`} />}
            <div className="col-span-2 sm:col-span-3">
              <dt className="font-medium text-slate-700">Origin</dt>
              <dd className="text-slate-600">{record.data.origin ?? "—"}</dd>
            </div>
          </dl>
        )}
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

export function HistoricalStatCards() {
  const stats = useAsync(fetchHistoricalStats, []);
  if (stats.status !== "success") return null;
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
      <span className="flex items-center gap-1.5">
        <History className="h-4 w-4" aria-hidden="true" /> {stats.data.total ?? 0} records
      </span>
      <span className="flex items-center gap-1.5">
        <Users className="h-4 w-4" aria-hidden="true" /> <NumberDisplay value={stats.data.totalAffected} /> affected
      </span>
    </div>
  );
}
