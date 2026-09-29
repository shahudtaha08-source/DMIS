import type { DashboardSummaryDTO } from "@dmis/shared";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, HeartHandshake, History, Package, TriangleAlert, Siren, Users } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { fetchDashboardSummary } from "../features/dashboard/api";
import { Card, CardBody, CardHeader, ErrorState, LoadingState, NumberDisplay, StatCard } from "../components/ui";
import { ActiveAlertBanner } from "../components/ActiveAlertBanner";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  VERIFIED: "Verified",
  RESPONSE_ACTIVE: "Response active",
  STABILIZED: "Stabilized",
  RESOLVED: "Resolved",
};

export function DashboardPage() {
  const { user } = useAuth();
  const { status, data, error, reload } = useAsync(fetchDashboardSummary, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h2>
        <p className="mt-1 text-slate-600">
          {status === "success" ? `Live operational overview, generated ${new Date(data.generatedAt).toLocaleString("en-IN")}.` : "Operational overview"}
        </p>
      </div>

      <ActiveAlertBanner />

      {status === "loading" && <LoadingState label="Loading dashboard…" />}
      {status === "error" && <ErrorState title="Dashboard temporarily unavailable" message={error.userMessage} onRetry={reload} />}
      {status === "success" && <DashboardMetrics data={data} />}
    </div>
  );
}

function DashboardMetrics({ data: d }: { data: DashboardSummaryDTO }) {
  const occupancyPct = d.shelterCapacityTotal && d.shelterOccupancyTotal !== null && d.shelterCapacityTotal > 0
    ? Math.round((d.shelterOccupancyTotal / d.shelterCapacityTotal) * 100)
    : null;
  const statusChart = d.incidentsByStatus.map((s) => ({ name: STATUS_LABEL[s.status] ?? s.status, count: s.count }));
  const decadeChart = d.historicalByDecade.map((b) => ({ decade: `${b.decade}s`, count: b.count }));

  return (
    <>
      {d.unavailable.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Some metrics are temporarily unavailable ({d.unavailable.join(", ")}) — shown as “—” below. The rest of the dashboard is unaffected.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active incidents"
          value={<NumberDisplay value={d.activeIncidents} />}
          icon={Siren}
          tone={(d.activeIncidents ?? 0) > 0 ? "critical" : "safe"}
          hint={d.criticalIncidents !== null ? `${d.criticalIncidents} critical` : undefined}
        />
        <StatCard label="Affected population" value={<NumberDisplay value={d.affectedPopulationEstimate} />} icon={Users} tone="warning" hint="Across active incidents" />
        <StatCard label="Historical disasters" value={<NumberDisplay value={d.historicalDisasterCount} />} icon={History} tone="info" hint="India, 1900–2024" />
        <StatCard
          label="Active rescue teams"
          value={<NumberDisplay value={d.activeTeams} />}
          icon={HeartHandshake}
          tone={(d.activeTeams ?? 0) > 0 ? "safe" : "neutral"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Shelter capacity"
          value={<NumberDisplay value={d.shelterCapacityTotal} />}
          icon={Building2}
          tone="info"
          hint={
            occupancyPct !== null
              ? `${occupancyPct}% occupied · ${d.sheltersOpen ?? "—"} open`
              : d.sheltersOpen !== null
                ? `${d.sheltersOpen} open`
                : undefined
          }
        />
        <StatCard
          label="Low / out-of-stock resources"
          value={
            <>
              <NumberDisplay value={d.resourcesLowStock} /> / <NumberDisplay value={d.resourcesOutOfStock} />
            </>
          }
          icon={Package}
          tone={(d.resourcesOutOfStock ?? 0) > 0 ? "critical" : (d.resourcesLowStock ?? 0) > 0 ? "warning" : "safe"}
          hint={d.resourcesTotal !== null ? `of ${d.resourcesTotal} tracked resources` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Current incidents by status" description="Live operational data" />
          <CardBody>
            {statusChart.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-600">No incidents recorded yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                    <Tooltip />
                    <Bar dataKey="count" name="Incidents" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Historical disasters by decade" description="783 recorded events, India, 1900–2024" />
          <CardBody>
            {decadeChart.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-600">Historical data unavailable.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decadeChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="decade" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Disasters" stroke="#dc2626" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
