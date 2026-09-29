# Dashboard Design (Chunk 6)

## Endpoint
`GET /api/dashboard/summary` — authenticated, all roles (ADMIN/OFFICER/VOLUNTEER all read the dashboard per `docs/AUTH_DESIGN.md`'s role matrix).

## Metrics (plan §20)
Active Incidents, Critical Incidents, Affected Population, Historical Disaster Count, Active Teams, Shelter Capacity (+ occupancy, + shelters open), Resource Availability (low-stock / out-of-stock / total), plus two chart datasets: current incidents grouped by status, and the 783 historical disasters bucketed by decade.

## Per-metric failure isolation
The plan's module-independence rule ("if Analytics fails, Dashboard must still work") is applied one level deeper here: **each of the 9 metrics is queried independently** and wrapped in its own try/catch in `modules/dashboard/service.ts`. A failing metric becomes `null` (or `[]` for the two chart arrays) and its name is added to `unavailable: string[]` — the endpoint still returns `200` with everything else intact, never a single all-or-nothing failure. The web page shows an inline amber banner naming the unavailable metrics and renders `—` (an em dash, via `NumberDisplay`) for each, so a stalled query never looks like a false "0 incidents."

This was verified two ways:
1. **17/17 backend tests** (`services/api`, `modules/dashboard/dashboard.test.ts`) against the real Express app with an injectable `DashboardRepository`, including a test that fails all 9 metrics simultaneously and confirms the response is still `200` with a fully-degraded-but-valid body.
2. **Live smoke test**: a real server with no database attached returned exactly this degraded shape end-to-end through the web app's dev proxy (see Chunk 6 summary).

## Decade bucketing
`HistoricalDisaster.startYear` is grouped in Postgres (`groupBy: ["startYear"]`) and bucketed into decades in the service layer (`Math.floor(year / 10) * 10`) rather than a raw SQL expression — one lightweight query, ~125 distinct years for 783 rows. Cross-checked directly in Postgres: decade buckets sum to exactly 783 (3+1+10+3+8+28+41+58+107+115+184+162+63), matching `docs/DATASET_ANALYSIS.md` exactly.

## Web
`pages/DashboardPage.tsx` always renders the "Welcome, {name}" header immediately (independent of the summary fetch), then loading/error/content for the metrics area via `useAsync` — so a slow or failed dashboard fetch never blanks the whole page. Charts use `recharts` (bar: incidents by status; line: historical disasters by decade), both with an honest empty state ("No incidents recorded yet") rather than a blank chart when a dataset is empty — expected right now since the operational tables have no data until Chunk 8 (Incidents) onward.
