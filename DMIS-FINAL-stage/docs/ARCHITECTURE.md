# DMIS Architecture

## 1. System overview

Two clients, one backend, one database, one source of truth.

```
React Web (Vite + TS)  ─┐
                          ├──►  Node.js/Express REST API  ──►  PostgreSQL
Flutter Mobile (Dart)  ─┘         (JWT auth, Prisma ORM)
```

- The Flutter app is **never** given its own backend, database, or hardcoded
  business logic. It consumes the exact same `/api/*` contract as the web app.
- The historical dataset (`disasterIND.csv`) is imported once into a
  dedicated `HistoricalDisaster` table and is read-only from the app's point
  of view. Operational entities (incidents, shelters, alerts, etc.) live in
  their own tables and are fully CRUD-able.

## 2. Repo / module structure

```
/apps
  /web           React app. One route + one feature folder per module.
  /mobile        Flutter app. One feature folder per module (lib/features/*).
/services
  /api           Express app. One router + one service + one Prisma-access
                 layer per module (routes/, controllers/, services/, repos/).
/packages
  /shared        Cross-cutting TypeScript: enums, DTO/interface shapes,
                 validation schemas shared by web and api. No business logic.
/prisma
  schema.prisma  Single source of truth for the DB schema.
  /imports       One-off / repeatable dataset import scripts.
  /seed          Idempotent seed entrypoint (npm run db:seed).
/docs            This documentation set.
```

### Per-module contract (applies to every module in §4 of the plan)

Every module — Dashboard, Incidents, Historical Disasters, Live Map, Alerts,
Shelters, Resources, Rescue Teams, Volunteers, Victims, Analytics,
Notifications, Emergency Contacts, Audit Logs, Settings — gets:

| Layer | Web | API |
|---|---|---|
| Entry point | `apps/web/src/pages/<module>/` | `services/api/src/modules/<module>/router.ts` |
| Data access | `apps/web/src/features/<module>/api.ts` (fetch/axios) | `services/api/src/modules/<module>/repository.ts` (Prisma) |
| Business logic | hooks in `features/<module>/` | `services/api/src/modules/<module>/service.ts` |
| Validation | Zod schema in `features/<module>/schema.ts` (mirrors shared) | Zod schema in `modules/<module>/validation.ts` (uses `@dmis/shared`) |
| Loading/error state | local to the module's route/component tree, wrapped in a module-level error boundary | module router returns the shared error envelope; never throws raw errors to Express's default handler |

Modules talk to each other only through the REST API contract in
`docs/API_DESIGN.md` — never by importing another module's internal
service/repository code directly.

### Genuinely shared infrastructure (the only things centralized)

- Auth (JWT issue/verify, RBAC middleware)
- API client (web: one `axios`/`fetch` wrapper with interceptors; mobile:
  one `Dio` instance)
- Database connection (single Prisma client instance)
- Design system (web: Tailwind config + shared UI primitives; mobile:
  Flutter theme)
- Shared TypeScript types/enums (`packages/shared`)
- Validation utilities (Zod helpers)
- Logging
- Error response format (see below)
- Configuration (`.env`)

Everything else — the actual business rules for each module — stays inside
that module's own folder.

## 3. Failure isolation

Requirement: a failure in one module must never take down another.

- **Backend**: every module router is mounted independently in
  `services/api/src/app.ts`. A module's own error-handling middleware
  catches its exceptions and returns the shared error envelope; an
  uncaught exception in one router does not crash the process (global
  error middleware is the last-resort net, not the first line of defense).
- **Web**: each top-level route is wrapped in its own React error boundary.
  If `/analytics` throws during render, the sidebar, topbar and every other
  route continue to work — the analytics route renders a
  "temporarily unavailable" panel instead of a blank screen.
- **Map**: the map is loaded inside its own boundary + its own data-fetch
  hook. If the map tiles/service fail, `Incidents`, `Shelters`, etc. remain
  fully usable, and the map view shows an inline fallback message rather
  than crashing the page.
- **Mobile**: each feature screen wraps its data layer in explicit
  loading/error/empty states; a failed request on one tab (e.g. Alerts)
  does not block navigation to another tab (e.g. Incidents).

### Shared error envelope (API → both clients)

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable, safe message",
    "module": "incidents"
  }
}
```

No stack traces, no raw Prisma/Postgres errors ever reach a client response.

## 4. Roles (RBAC)

`ADMIN`, `OFFICER`, `VOLUNTEER` — defined once in `packages/shared`, enforced
by API middleware, and mirrored (not re-implemented) on both clients for UI
gating only. The API is the actual authority; client-side role checks are a
UX convenience, never the security boundary.

## 5. Phase / chunk roadmap

**Phase 1 — Foundation**: 1) Audit + architecture + dataset analysis (this
chunk) · 2) PostgreSQL + Prisma + data model · 3) Backend core + API
architecture · 4) Authentication + RBAC.

**Phase 2 — Web Core**: 5) Web shell + design system · 6) Dashboard ·
7) Historical Disaster Explorer · 8) Incident Management.

**Phase 3 — Emergency Operations**: 9) Live Map · 10) Alerts &
Notifications · 11) Shelters · 12) Resources · 13) Rescue Teams + Volunteers.

**Phase 4 — Reporting**: 14) Victims & Reports · 15) Analytics · 16) Search
+ Audit Logs.

**Phase 5 — Flutter Mobile**: 17) Foundation + API integration ·
18) Authentication + navigation · 19) Dashboard + Incidents · 20) Map +
Alerts · 21) Shelters + Resources + Teams.

**Phase 6 — Production**: 22) Cross-platform synchronization ·
23) Responsive + UX hardening · 24) Render + PostgreSQL deployment ·
25) Final QA + demo prep.

Each chunk ships a complete, runnable, self-contained ZIP building on the
previous one (`DMIS-Phase{N}-Chunk{M}.zip`); a regression in a previously
completed chunk is fixed before the new chunk is declared done.
