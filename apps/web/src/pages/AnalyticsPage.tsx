import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Building2, Package, Siren, TriangleAlert, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardBody, CardHeader, ErrorState, LoadingState, NumberDisplay, StatCard } from "../components/ui";
import { fetchAnalyticsOverview } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";

const PIE_COLOURS = ["#dc2626", "#d97706", "#2563eb", "#7c3aed", "#0d9488", "#64748b"];

/**
 * Analytics (Chunk 15). Reuses the dashboard's aggregation style — no second
 * data model, no duplicated ETL. Historical and operational figures are shown
 * side by side but never summed together: one is the archive, the other is
 * the live picture.
 */
export function AnalyticsPage() {
  const { status, data, error, reload } = useAsync(fetchAnalyticsOverview, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Historical disaster intelligence and live response metrics, aggregated from the same database both clients read."
      />

      {status === "loading" && <LoadingState label="Computing analytics…" />}
      {status === "error" && <ErrorState title="Analytics unavailable" message={error.userMessage} onRetry={reload} />}

      {status === "success" && (
        <div className="space-y-6">
          {data.unavailable.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Some metrics could not be computed ({data.unavailable.join(", ")}) and are shown as “—”.</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Historical disasters"
              value={<NumberDisplay value={data.totalHistoricalDisasters} />}
              icon={BarChart3}
              tone="info"
              hint="Archive, 1900–2024"
            />
            <StatCard
              label="Current incidents"
              value={<NumberDisplay value={data.totalIncidents} />}
              icon={Siren}
              tone={data.activeIncidents ? "critical" : "safe"}
              hint={data.activeIncidents !== null ? `${data.activeIncidents} still active` : undefined}
            />
            <StatCard
              label="Affected population"
              value={<NumberDisplay value={data.affectedPopulation} />}
              icon={Users}
              tone="warning"
              hint="Live incidents"
            />
            <StatCard
              label="Recorded deaths"
              value={<NumberDisplay value={data.totalDeaths} />}
              icon={TriangleAlert}
              tone="neutral"
              hint="Historical archive"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Incidents by severity" description="Live incidents grouped by the severity assigned at report time." />
              <CardBody className="h-72">
                {data.incidentsBySeverity.length === 0 ? (
                  <EmptyChart label="No incidents reported yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.incidentsBySeverity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                      <Tooltip />
                      <Bar dataKey="count" name="Incidents" radius={[6, 6, 0, 0]}>
                        {data.incidentsBySeverity.map((s) => (
                          <Cell key={s.severity} fill={PIE_COLOURS[["CRITICAL", "HIGH", "MODERATE", "LOW"].indexOf(s.severity) % PIE_COLOURS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Incidents by status" description="Where each incident sits in the response lifecycle." />
              <CardBody className="h-72">
                {data.incidentsByStatus.length === 0 ? (
                  <EmptyChart label="No incidents reported yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.incidentsByStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {data.incidentsByStatus.map((s, i) => (
                          <Cell key={s.status} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend formatter={(v: string) => v.replace(/_/g, " ")} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Historical disasters by type" description="Top types from the imported 1900–2024 archive." />
              <CardBody className="h-72">
                {data.historicalByType.length === 0 ? (
                  <EmptyChart label="Historical data is unavailable." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.historicalByType} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="type" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Disasters" fill="#2563eb" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Historical events per decade" description="Long-run trend across the archive." />
              <CardBody className="h-72">
                {data.historicalByDecade.length === 0 ? (
                  <EmptyChart label="Historical data is unavailable." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.historicalByDecade.map((d) => ({ decade: `${d.decade}s`, count: d.count }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="decade" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                      <Tooltip />
                      <Bar dataKey="count" name="Disasters" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader title="Shelter utilisation" description="Occupancy against total capacity." />
              <CardBody className="space-y-3">
                <p className="text-3xl font-bold text-slate-900">
                  {data.shelterUtilizationPercent !== null ? `${data.shelterUtilizationPercent}%` : "—"}
                </p>
                <p className="text-sm text-slate-600">
                  <NumberDisplay value={data.shelterOccupancy} /> of <NumberDisplay value={data.shelterCapacity} /> beds occupied
                </p>
                <Building2 className="h-5 w-5 text-slate-300" aria-hidden="true" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Resource availability" description="Current relief stock health." />
              <CardBody className="space-y-2 text-sm">
                {data.resourceAvailability ? (
                  <>
                    <Row label="Total items" value={data.resourceAvailability.total} />
                    <Row label="Available" value={data.resourceAvailability.available} tone="text-emerald-700" />
                    <Row label="Low stock" value={data.resourceAvailability.lowStock} tone="text-amber-700" />
                    <Row label="Out of stock" value={data.resourceAvailability.outOfStock} tone="text-red-700" />
                    <Package className="mt-1 h-5 w-5 text-slate-300" aria-hidden="true" />
                  </>
                ) : (
                  <p className="text-slate-600">Unavailable</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Live incidents by type" description="What is happening right now." />
              <CardBody className="space-y-2">
                {data.incidentsByType.length === 0 ? (
                  <p className="text-sm text-slate-600">No live incidents.</p>
                ) : (
                  data.incidentsByType.map((t) => (
                    <div key={t.type} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm last:border-0">
                      <span className="text-slate-700">{t.type}</span>
                      <span className="font-semibold tabular-nums text-slate-900">{t.count}</span>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value.toLocaleString("en-IN")}</span>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">{label}</div>
  );
}
