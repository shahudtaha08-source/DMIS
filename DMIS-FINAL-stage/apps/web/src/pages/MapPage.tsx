import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoPointDTO, MapLayersDTO, Severity } from "@dmis/shared";
import { Building2, History, Layers, List, Map as MapIcon, Siren, TriangleAlert } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button, Card, CardBody, ErrorState, LoadingState } from "../components/ui";
import { fetchMapLayers } from "../features/operations/api";
import { useAsync } from "../hooks/useAsync";
import { cn } from "../lib/cn";

/**
 * Live Map (Chunk 9). OpenStreetMap tiles via Leaflet — no API key, no
 * account, no billing.
 *
 * Failure isolation is the design point: tile errors, a missing layer, or no
 * network at all degrade to the list view beside the map, which is a complete
 * location visualisation in its own right. The rest of the application never
 * depends on the map being available.
 */

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#d97706",
  MODERATE: "#2563eb",
  LOW: "#0891b2",
};

const STATUS_COLOR: Record<string, string> = {
  REPORTED: "#d97706",
  VERIFIED: "#2563eb",
  RESPONSE_ACTIVE: "#dc2626",
  STABILIZED: "#7c3aed",
  RESOLVED: "#16a34a",
};

type LayerKey = "incidents" | "shelters" | "historical";

const LAYERS: { key: LayerKey; label: string; Icon: typeof Siren }[] = [
  { key: "incidents", label: "Active incidents", Icon: Siren },
  { key: "shelters", label: "Shelters", Icon: Building2 },
  { key: "historical", label: "Historical events", Icon: History },
];

export function MapPage() {
  const layers = useAsync(fetchMapLayers, []);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({ incidents: true, shelters: true, historical: false });
  const [tilesFailed, setTilesFailed] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");

  const data: MapLayersDTO | null = layers.status === "success" ? layers.data : null;
  const points = useMemo(() => buildPoints(data, visible), [data, visible]);
  const recent = useMemo(() => (data ? [...data.historical].sort((a, b) => b.year - a.year).slice(0, 40) : []), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Map"
        description="Current incidents, shelters and historical events across India. Historical markers are shown only for records that genuinely have coordinates in the source dataset."
        actions={
          <>
            {LAYERS.map(({ key, label, Icon }) => (
              <Button
                key={key}
                variant={visible[key] ? "primary" : "secondary"}
                size="sm"
                onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                aria-pressed={visible[key]}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
              title="Switch between map and list"
            >
              {view === "map" ? <List className="h-4 w-4" aria-hidden="true" /> : <MapIcon className="h-4 w-4" aria-hidden="true" />}
              {view === "map" ? "List view" : "Map view"}
            </Button>
          </>
        }
      />

      {layers.status === "loading" && <LoadingState label="Loading map layers…" />}
      {layers.status === "error" && <ErrorState title="Map data unavailable" message={layers.error.userMessage} onRetry={layers.reload} />}

      {data && (
        <>
          {data.unavailable.length > 0 && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              These layers could not be loaded: {data.unavailable.join(", ")}. The rest of the map is unaffected.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardBody className="p-0">
                {view === "map" && !tilesFailed ? (
                  <MapCanvas points={points} onTileError={() => setTilesFailed(true)} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 px-6 py-14 text-center">
                    <Layers className="h-7 w-7 text-slate-400" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {tilesFailed ? "Map tiles are unavailable" : "List view"}
                      </h3>
                      <p className="mt-1 max-w-sm text-sm text-slate-600">
                        {tilesFailed
                          ? "Basemap tiles could not be loaded, so every location is listed below instead. All DMIS functionality continues to work."
                          : "Showing every mapped location as a sortable list."}
                      </p>
                    </div>
                    {tilesFailed && (
                      <Button variant="secondary" onClick={() => setTilesFailed(false)}>
                        Try the map again
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardBody className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">At a glance</h3>
                  <LayerStat label="Active incidents" value={data.incidents.length} tone={data.incidents.length ? "critical" : "safe"} />
                  <LayerStat label="Shelters with beds" value={data.shelters.filter((s) => s.availableBeds > 0).length} tone="info" />
                  <LayerStat label="Teams on roster" value={data.teams.length} tone="neutral" />
                  <LayerStat label="Historical points" value={data.historical.length} tone="info" />
                </CardBody>
              </Card>

              <Card>
                <CardBody className="max-h-96 space-y-2 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-slate-900">Most recent historical events</h3>
                  {recent.length === 0 && <p className="text-sm text-slate-600">No historical events with coordinates.</p>}
                  <ul className="space-y-1.5">
                    {recent.map((h) => (
                      <HistoricalRow key={h.id} point={h} />
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LayerStat({ label, value, tone }: { label: string; value: number; tone: "critical" | "safe" | "info" | "neutral" }) {
  const colour = { critical: "text-red-700", safe: "text-emerald-700", info: "text-blue-700", neutral: "text-slate-900" }[tone];
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={cn("text-lg font-bold tabular-nums", colour)}>{value.toLocaleString("en-IN")}</span>
    </div>
  );
}

function HistoricalRow({ point }: { point: GeoPointDTO }) {
  return (
    <li className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{point.label}</p>
        <p className="text-xs text-slate-500">
          {point.year}
          {point.totalAffected ? ` · ${point.totalAffected.toLocaleString("en-IN")} affected` : ""}
        </p>
      </div>
      <a
        className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
        href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=11/${point.latitude}/${point.longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        Map
      </a>
    </li>
  );
}

interface Pin {
  lat: number;
  lng: number;
  color: string;
  radius: number;
  popup: string;
  group: LayerKey;
}

function buildPoints(data: MapLayersDTO | null, visible: Record<LayerKey, boolean>): Pin[] {
  if (!data) return [];
  const pins: Pin[] = [];
  if (visible.incidents) {
    for (const i of data.incidents) {
      pins.push({
        lat: i.latitude,
        lng: i.longitude,
        color: SEVERITY_COLOR[i.severity] ?? "#334155",
        radius: 9,
        popup: `<strong>${escapeHtml(i.title)}</strong><br/>${escapeHtml(i.location)}<br/>${i.severity} · ${i.status.replace(/_/g, " ")}`,
        group: "incidents",
      });
    }
  }
  if (visible.shelters) {
    for (const s of data.shelters) {
      pins.push({
        lat: s.latitude,
        lng: s.longitude,
        color: s.availableBeds > 0 ? "#0d9488" : "#dc2626",
        radius: 7,
        popup: `<strong>${escapeHtml(s.name)}</strong><br/>${s.availableBeds} beds available`,
        group: "shelters",
      });
    }
  }
  if (visible.historical) {
    for (const h of data.historical) {
      pins.push({
        lat: h.latitude,
        lng: h.longitude,
        color: STATUS_COLOR.REPORTED,
        radius: 4,
        popup: `<strong>${escapeHtml(h.label)}</strong><br/>${h.year}`,
        group: "historical",
      });
    }
  }
  return pins;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** Leaflet is loaded dynamically: if the chunk or the tiles are unreachable,
 *  the surrounding list view stays usable. */
function MapCanvas({ points, onTileError }: { points: Pin[]; onTileError: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { center: [22.5, 79], zoom: 5, scrollWheelZoom: true });
        const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "© OpenStreetMap contributors",
        });
        tiles.on("tileerror", () => onTileError());
        tiles.addTo(map);
        layerRef.current = L.layerGroup();
        layerRef.current.addTo(map);
        mapRef.current = map;
        setReady(true);
      } catch {
        onTileError();
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onTileError]);

  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      layerRef.current.clearLayers();
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], {
          radius: p.radius,
          color: p.color,
          weight: 2,
          fillColor: p.color,
          fillOpacity: 0.7,
        })
          .bindPopup(p.popup)
          .addTo(layerRef.current);
      }
    })();
  }, [points, ready]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-xl" aria-label="Map of India showing disasters and response assets" />;
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="critical">Incident — critical</Badge>
      <Badge tone="warning">Incident — high</Badge>
      <Badge tone="info">Incident — moderate</Badge>
      <Badge tone="safe">Shelter with beds</Badge>
    </div>
  );
}
