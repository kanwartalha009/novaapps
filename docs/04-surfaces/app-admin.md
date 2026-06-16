# Surface: app-admin (App Shell)

**Next.js · Vercel/Railway · :3003 · `[app-slug].nova-platform.<domain>` (wildcard).** Audience: `app-shell` JWT.

> Responsibilities, sections, and endpoints: **`02-shells/app-shell.md`** (canonical). This file covers only frontend mechanics.

- **Middleware:** resolve `[app-slug]` subdomain → rewrite to internal `/a/[appSlug]`; public routes carry **no** `/apps/` prefix. JWT audience must be `app-shell`; API re-verifies.
- **Data:** all via API (`apps:*` permissions). Currently scaffolded against `FX_*` fixtures (`@nova/shared`); backend work per phase = replace fixtures with API calls; page structure is final.
- **Sections (routes):** `/a/[appSlug]` overview · `/specs` blueprint · `/backend` · `/features/[feature]` · `/export` build-pack · `/embed` · `/api/auth` · `/api/webhooks`.
- **Correction (F3):** legacy per-app-DB-in-monorepo + subdomain-hosted-backend UX is removed; this surface orchestrates standalone repos, it does not host them (ADR-010).
