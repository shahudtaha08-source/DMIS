# Web App Design (Chunk 5)

React 18 + TypeScript + Vite + Tailwind 3 + React Router 6 + lucide-react. Lives in `apps/web`, consumes only the REST API (`/api`) through one client.

## Structure
```
src/
  lib/api.ts            single API client: envelope unwrapping, friendly errors, timeout, health probe
  auth/                 AuthContext (login/logout/restore/hasRole), ProtectedRoute + RequireRole, tokenStore
  config/modules.ts     single source of truth for nav, roles, and module readiness (live | planned)
  components/ui/        design system: Button, Badge/SeverityBadge, Card/StatCard, TextField/SelectField/TextareaField,
                        Table*, Dialog, Toast, LoadingState/ErrorState/EmptyState/Skeleton
  components/layout/    AppShell, Sidebar (drawer < lg), Topbar (live API status pill, user, sign out)
  components/ModuleBoundary.tsx   per-route error boundary
  hooks/                useAsync (loading/error/retry per module), useApiStatus (polls /api/health)
  pages/                LoginPage, DashboardPage (interim), ModulePlaceholderPage, NotFoundPage, DesignSystemPage (dev only)
```
Feature modules added in later chunks follow: `pages/<module>/` + `features/<module>/api.ts`, registered by flipping `status: "live"` in `config/modules.ts` and adding the page to `PAGES` in `App.tsx`.

## Failure isolation
- Every module route is wrapped in `ModuleBoundary`: a render crash shows "<Module> is temporarily unavailable" with retry; the sidebar/topbar and all other routes keep working; navigating away clears the error.
- Data failures are handled per page with `useAsync` + `ErrorState` (retry), never a blank screen.
- A network/5xx failure while restoring a session does **not** log the user out: the token is kept and a "Try again" screen is shown. Only a 401 clears the session.

## API error handling (plan §43)
401 (session expired → sign-in; on login: credentials message), 403, 404, 409/422 (server message shown — it is user-actionable), 429, 503, other 5xx (generic text, raw server text never shown), timeout (15 s), offline/network failure.

## Emergency UX (plan §41)
Critical = red, Warning = amber, Normal = blue, Safe/Resolved = green. Colour is never the only signal: every badge has an icon and a text label; the API status pill has icon + text; form errors have icon + text and `role="alert"`.

## Responsive / accessibility groundwork
Sidebar becomes an overlay drawer below `lg`; tables scroll inside their own container (no page-level horizontal overflow); touch targets ≥ 44px on mobile; `viewport-fit=cover` with safe-area insets; skip-to-content link; visible focus ring; dialog has focus trap, Escape, and focus restore; `prefers-reduced-motion` respected. **Not yet verified on real devices/browsers** — that is Chunk 23.

## Environment
Dev: the browser calls same-origin `/api` and Vite proxies to `http://localhost:4000` (override with `API_PROXY_TARGET`), so no CORS setup locally. Production: build with `VITE_API_BASE_URL=https://<render-api>/api` and add the web origin to the API's `CORS_ORIGINS`.

## Known trade-offs
- JWT is kept in `localStorage` (session survives reloads). Any XSS could read it; mitigated by rendering no untrusted HTML and helmet headers on the API. An httpOnly-cookie session would be stricter but complicates the Flutter client sharing the same API.
- Emergency Contacts and Settings have no chunk in the plan; they are tentatively shown as Chunk 16.
