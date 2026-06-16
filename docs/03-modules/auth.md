# Module: auth

**Owns:** login/refresh/logout, JWT issuance, password hashing, session security.
**Depends on:** users. **Consumed by:** all surfaces.

## Behavior
- Email+password login (argon2). Issues access JWT (15m) + rotating refresh token (30d, hashed in DB).
- JWT claims: `sub` (userId), `aud` (`admin` | `agency`), `agencyId?` (current tenant), permissions snapshot for admin tokens.
- Browser delivery: httpOnly secure cookies; SameSite=Lax; CSRF token for mutating requests.
- Guards: `JwtAuthGuard` (global), `@Public()` escape hatch, `PermissionsGuard` (rbac), `AgencyScopeGuard` (tenant match).

## Endpoints
```
POST /auth/login            { email, password, audience }
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password  (Phase 2)
POST /auth/reset-password   (Phase 2)
GET  /auth/me
```

## Out of scope here
Role/permission management (rbac), agency signup (agencies module), OAuth with Shopify (stores module).

## Implementation notes (Phase 1 — implemented)
- Implemented: `POST /auth/login|refresh|logout`, `GET /auth/me`, global `JwtAuthGuard` + `@Public()`, rotating refresh tokens (sha256-hashed in DB), argon2id hashing.
- Cookies: `nova_access` (15m) and `nova_refresh` (30d), httpOnly, SameSite=Lax, Secure in production.
- **Browser transport**: each Next.js app proxies `/api/* → API /v1/*` via `next.config.ts` rewrites so cookies are first-party per app (no cross-site cookie issues). Server components call the API directly with forwarded cookies. Transport only — invariant I-2 intact.
- Agency refresh re-derives tenant from the user's first membership; multi-agency users must re-login to switch tenants (acceptable until multi-tenancy switching is spec'd).
- Seeded dev admin: `admin@nova-apps.dev` / `admin12345` (override via `SEED_ADMIN_EMAIL/PASSWORD`).
- Pending from this spec: forgot/reset password (Phase 2), `PermissionsGuard` + `AgencyScopeGuard` (land with first guarded endpoints).

## Dev bypass (no database)
`AUTH_DEV_BYPASS=true` (honored only when `NODE_ENV !== 'production'`; the API refuses to boot if both are set):
- `POST /auth/login` accepts **any** email/password. Admin sessions get ALL permissions; agency sessions get `agencyId: 'dev-agency'`, OWNER role, slug from the request.
- Sessions are stateless 12h JWTs (refresh cookie = the same JWT; `/auth/refresh` re-signs it). No tables touched.
- `POST /agencies/signup` returns a fake PENDING_APPROVAL response, persists nothing.
- Every bypass action logs a `[AUTH_DEV_BYPASS]` warning. Real auth resumes by setting the flag to `false` — same endpoints, same cookies, zero frontend changes.
