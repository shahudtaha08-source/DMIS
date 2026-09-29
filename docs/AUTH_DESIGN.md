# Authentication & RBAC Design (Chunk 4)

## Flow
1. An ADMIN creates accounts (`POST /api/auth/register`). There is no self-service signup. The first ADMIN is bootstrapped by `npm run db:seed` from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (never hardcoded; existing accounts are never overwritten).
2. `POST /api/auth/login` → `{ token, user }`. Clients send `Authorization: Bearer <token>`.
3. `POST /api/auth/refresh` exchanges a still-valid token for a fresh one (sliding session). An expired token cannot be refreshed; the user logs in again.
4. `GET /api/auth/me` returns the current user (used for session restoration on web and Flutter).

## Security decisions
- **Passwords**: bcrypt (`bcryptjs`, pure JS, cost 12; 4 under test). 8–72 chars with a letter and a number (72 = bcrypt's byte limit). Hashes are never returned by any endpoint.
- **JWT**: HS256, algorithm pinned on verify (`alg: none` rejected), issuer `dmis-api`, expiry `JWT_EXPIRES_IN` (default 8h). In production the server refuses to start unless `JWT_SECRET` is ≥ 32 chars.
- **Live user check**: `authenticate` reloads the user from the database on every request. Deactivating an account or changing a role takes effect immediately; the role used for authorization is the database role, not the one in the token.
- **No account enumeration**: unknown email, wrong password, and deactivated account return the identical 401 message, and a bcrypt comparison always runs (dummy hash) to equalise timing.
- **Brute force**: login is rate-limited (10 attempts / 15 min / IP, `429`). `trust proxy` is enabled in production so the limit keys on the real client IP behind Render.
- **Errors**: all failures use the shared envelope (401/403/409/422/429); database outage on auth routes returns 503, never a stack trace.

## Role matrix (enforced per module as each is built)
| Capability | ADMIN | OFFICER | VOLUNTEER |
|---|---|---|---|
| User management, audit logs, settings | ✅ | ❌ | ❌ |
| Incidents, alerts, shelters, resources, teams, volunteers | ✅ create/edit | ✅ create/edit | 👁 read |
| Victim reports | ✅ | ✅ | ✅ create, read |
| Dashboard, map, analytics, historical data, contacts | ✅ | ✅ | 👁 read (analytics: ADMIN/OFFICER) |

Server-side: `authenticate` then `requireRole(...)` from `middleware/auth.ts`. Client-side role gating (web/Flutter) is UX only, never the security boundary.

## Testing
`npm test --workspace=services/api` runs 12 tests (node:test) against the real Express app using an injected in-memory `UserRepository`. The Prisma repository is the default implementation.
