# API Design

Base URL: `/api`. JSON in, JSON out. JWT bearer auth on every route except
`/api/auth/login` and `GET /api/health`. Every module below is an
independently-mounted Express router — one failing module cannot take down
another (see `docs/ARCHITECTURE.md` §3).

Response envelope (success):
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 123 } }
```
`meta` only present on paginated list endpoints. Error envelope is documented
in `ARCHITECTURE.md`.

## `/api/health`
- `GET /api/health` — liveness/readiness probe, no auth. (Chunk 3)

## `/api/auth`  (implemented in Chunk 4 — see `docs/AUTH_DESIGN.md`)
- `POST /api/auth/login` — public, rate-limited; returns `{ token, user }`
- `POST /api/auth/register` — **ADMIN only**; creates a user (no self-service signup)
- `POST /api/auth/refresh` — valid token → fresh token
- `GET /api/auth/me` — current user

## `/api/dashboard`
- `GET /api/dashboard/summary` — active incidents, critical incidents,
  affected population, historical disaster count, active teams, shelter
  capacity/occupancy, resource availability (all DB-driven). (Chunk 6)

## `/api/historical-disasters`
- `GET /api/historical-disasters` — paginated, filter by `type`, `subtype`,
  `yearFrom`, `yearTo`, `location`, `minDeaths`, sort, search
- `GET /api/historical-disasters/:id`
- `GET /api/historical-disasters/stats` — aggregates for charts (by type,
  by year, by region)
- `GET /api/historical-disasters/geo` — lightweight lat/lon-only list for
  map layers
(Chunk 7)

## `/api/incidents`
- `GET /api/incidents` — paginated, filter by status/severity/type
- `POST /api/incidents`
- `GET /api/incidents/:id`
- `PATCH /api/incidents/:id`
- `PATCH /api/incidents/:id/status` — enforces lifecycle transition rules
- `PATCH /api/incidents/:id/assign-team`
(Chunk 8)

## `/api/map`
- `GET /api/map/layers` — combined lightweight payload: historical points,
  active incidents, shelters, teams (each independently fetch-able below
  too, so a failure in one layer doesn't blank the whole map)
(Chunk 9, composes Chunk 7/8/11/13 endpoints)

## `/api/alerts`
- `GET /api/alerts`
- `POST /api/alerts`
- `PATCH /api/alerts/:id`
- `PATCH /api/alerts/:id/publish`
- `PATCH /api/alerts/:id/deactivate`
(Chunk 10)

## `/api/shelters`
- `GET /api/shelters`
- `POST /api/shelters`
- `GET /api/shelters/:id`
- `PATCH /api/shelters/:id`
- `PATCH /api/shelters/:id/occupancy`
(Chunk 11)

## `/api/resources`
- `GET /api/resources` — includes low-stock flags
- `POST /api/resources`
- `PATCH /api/resources/:id`
- `POST /api/resources/:id/transactions` — allocate/restock/return
- `GET /api/resources/:id/transactions`
(Chunk 12)

## `/api/teams`
- `GET /api/teams`
- `POST /api/teams`
- `PATCH /api/teams/:id`
- `PATCH /api/teams/:id/status`

## `/api/volunteers`
- `GET /api/volunteers`
- `POST /api/volunteers`
- `PATCH /api/volunteers/:id`
- `PATCH /api/volunteers/:id/assign`
(Chunk 13)

## `/api/victims`
- `GET /api/victims` — filter by incident/status
- `POST /api/victims`
- `PATCH /api/victims/:id`
(Chunk 14)

## `/api/analytics`
- `GET /api/analytics/trends` — historical trends over time
- `GET /api/analytics/geographic` — distribution by state/region
- `GET /api/analytics/response-metrics` — current incidents, resource
  usage, shelter utilization
(Chunk 15)

## `/api/search`
- `GET /api/search?q=...&types=incidents,shelters,historical` — modular:
  each entity type is searched independently and a failure in one does not
  fail the others (partial results returned with a per-type status flag)

## `/api/notifications`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## `/api/audit-logs`
- `GET /api/audit-logs` — ADMIN only, filter by entityType/user/date
(Chunk 16)

## `/api/emergency-contacts`
- `GET /api/emergency-contacts`
- `POST /api/emergency-contacts`
- `PATCH /api/emergency-contacts/:id`

## `/api/settings`
- `GET /api/settings/profile`
- `PATCH /api/settings/profile`

All list endpoints support `?page=&pageSize=` (default pageSize 20, max
100) — the full historical dataset is never sent to a client in one
response (see `ARCHITECTURE.md` §46 performance rules).
