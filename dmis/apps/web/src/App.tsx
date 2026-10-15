import type { ComponentType, ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, RequireRole } from "./auth/ProtectedRoute";
import { ModuleBoundary } from "./components/ModuleBoundary";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "./components/ui";
import { MODULES, type ModuleDef, type ModuleId } from "./config/modules";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DesignSystemPage } from "./pages/DesignSystemPage";
import { HistoricalPage } from "./pages/HistoricalPage";
import { IncidentDetailPage } from "./pages/IncidentDetailPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { LoginPage } from "./pages/LoginPage";
import { MapPage } from "./pages/MapPage";
import { ModulePlaceholderPage } from "./pages/ModulePlaceholderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { SheltersPage } from "./pages/SheltersPage";
import { TeamsPage } from "./pages/TeamsPage";

/** Register a module's real page here when it is built; everything else falls back to the placeholder. */
const PAGES: Partial<Record<ModuleId, ComponentType>> = {
  dashboard: DashboardPage,
  historical: HistoricalPage,
  incidents: IncidentsPage,
  alerts: AlertsPage,
  shelters: SheltersPage,
  resources: ResourcesPage,
  teams: TeamsPage,
  map: MapPage,
  analytics: AnalyticsPage,
};

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

function moduleElement(m: ModuleDef) {
  const Page = PAGES[m.id];
  return (
    <RequireRole roles={m.roles}>
      <ModuleBoundary name={m.label}>{Page ? <Page /> : <ModulePlaceholderPage module={m} />}</ModuleBoundary>
    </RequireRole>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {MODULES.map((m) =>
            m.path === "/" ? <Route key={m.id} index element={moduleElement(m)} /> : <Route key={m.id} path={m.path.slice(1)} element={moduleElement(m)} />
          )}
          {/* Detail views are not in MODULES (they are not navigation entries) but share the same shell + boundary. */}
          <Route
            path="incidents/:id"
            element={
              <ModuleBoundary name="Incident detail">
                <IncidentDetailPage />
              </ModuleBoundary>
            }
          />
          {import.meta.env.DEV && (
            <Route path="design-system" element={<ModuleBoundary name="Design system"><DesignSystemPage /></ModuleBoundary>} />
          )}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
