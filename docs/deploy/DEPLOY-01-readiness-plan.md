# DEPLOY‑01 — Phased Readiness Plan (Vercel + Railway + Postgres)

**Date:** 2026-06-15 · **Read order:** this → DEPLOY‑02 (accounts) → DEPLOY‑03 (deployment).

## Target topology

```
                ┌────────────────────────── one root domain (e.g. nova.app) ──────────────────────────┐
  Vercel        │  admin.<root>   agency.<root>   app.<root>   apps.<root>(app-admin)  tools.<root>     │
  (5 Next apps) │      │              │              │              │                     │             │
                │      └──────────────┴───────credentialed fetch (cookies on .<root>)─────┘             │
                │                                     ▼                                                  │
  Railway       │                         api.<root>  ──►  NestJS API (apps/api, /v1)                    │
                │                                     │                                                  │
                │                         Railway Postgres  ◄── DATABASE_URL                             │
                └───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Railway** runs the long‑lived NestJS API + managed Postgres (the API has in‑process schedulers, raw‑body webhooks, cookie sessions — not a serverless fit).
- **Vercel** runs the 5 Next.js apps as 5 projects: `web`(3000) `admin`(3001) `agency`(3002) `app-admin`(3003) `tool-admin`(3004).
- **One custom root domain is required** (see Blocker B2) — cookie auth only works when API + frontends are subdomains of the same registrable domain.

## Audit result

**Ready already ✅**
- Committed Prisma migrations exist (`packages/database/prisma/migrations/` — 3 of them) → production uses `migrate deploy`, not `db push`.
- Health endpoint exists (`modules/health/health.controller.ts`) → Railway healthcheck target.
- All 5 apps have `next.config.ts`; `@nova/shared` + `@nova/database` build to `dist` (turbo `^build` ordering handles it).
- CORS is env‑driven (`CORS_ORIGINS`, `credentials:true`); `main.ts` already throws if `AUTH_DEV_BYPASS=true` in production.
- Postgres datasource is standard `env("DATABASE_URL")`.

**Blockers ❌ (fixed in Phase 1)**
- **B1 — Prisma scripts are `dotenv -e ../../.env`‑wrapped.** Railway injects env vars (no `.env` file) → `migrate:deploy` / `generate` / `seed` fail. Need non‑dotenv CI variants.
- **B2 — Cross‑domain cookie auth.** Cookies are `httpOnly, secure:isProd, sameSite:"lax"`, **no `domain`**. Between `*.vercel.app` and `*.railway.app` (different registrable domains) the cookie won't be sent → login appears to work but every authed call is 401. Requires a shared root domain + `COOKIE_DOMAIN`.
- **B3 — No deploy config** (no `railway.json`, no Node pin, no per‑app Vercel build settings).
- **B4 — Production secrets/env** not set (still `change-me` placeholders).

---

## Phase 0 — Decisions & prerequisites
1. **Pick the root domain** (this unblocks B2). Anything you own works — e.g. `nova.app`. All services live under it: `api.`, `admin.`, `agency.`, `app.`, `apps.`, `tools.`.
2. **Pick a region** and use it for both Railway (Postgres + API) and Vercel functions to minimize latency (e.g. US‑East).
3. **Pin Node 22** (engines say `>=20`; pin so cloud builds match local). Add repo‑root `.nvmrc`:
   ```
   22
   ```
4. Repo is on GitHub (DEPLOY‑02 §1) — both Railway and Vercel deploy from it.

## Phase 1 — Code/config changes to make it deployable
Apply these (small, mechanical). Each is required to deploy.

**1.1 Prisma scripts (B1)** — `packages/database/package.json`. `prisma generate` doesn't need `DATABASE_URL` (it's resolved at client runtime), so drop the dotenv wrapper from `generate` + `build` — these run during `turbo build` on Railway where there's no `.env`. Add non‑dotenv CI variants for the DB‑connecting deploy steps; keep dotenv on local dev commands:
```jsonc
"generate": "prisma generate",
"build": "prisma generate && tsc -p tsconfig.json",
"migrate:deploy:ci": "prisma migrate deploy",
"seed:ci": "tsx prisma/seed.ts"
// keep dotenv-wrapped for local: migrate:dev, migrate:deploy, seed, studio
```
Railway's build runs the de‑dotenv'd `build`; `preDeployCommand` runs `migrate:deploy:ci`; the one‑time seed runs `seed:ci`.

**1.2 Production cookie domain (B2)** — `apps/api/src/modules/auth/auth.controller.ts`, extend the cookie base so prod scopes cookies to the root domain:
```ts
const base = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};
```
Set `COOKIE_DOMAIN=.<root>` (e.g. `.nova.app`) on Railway. `sameSite:lax` is correct once API + frontends are same‑site subdomains.

**1.3 Railway service config (B3)** — repo‑root `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS", "buildCommand": "pnpm install --frozen-lockfile && pnpm turbo run build --filter=api..." },
  "deploy": {
    "startCommand": "node apps/api/dist/main.js",
    "preDeployCommand": "pnpm --filter @nova/database run migrate:deploy:ci",
    "healthcheckPath": "/v1/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE"
  }
}
```
`preDeployCommand` runs migrations on every deploy (safe + idempotent). `--filter=api...` builds the API and its `@nova/*` deps in order.

**1.4 Vercel per‑app settings (B3)** — set in each project's dashboard (no file needed), identical pattern, only the filter changes:
- Root Directory: `apps/<app>` · Framework: Next.js
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm turbo run build --filter=<app>...`
- (Optional `vercel.json` per app can encode the same; the deploy plan uses dashboard settings.)

**1.5 Production env hygiene** — confirm `AUTH_DEV_BYPASS` unset/false everywhere; `NODE_ENV=production` on Railway.

**1.6 Health path** — confirm the health controller serves `GET /v1/health` (global prefix `/v1`). If it's mounted elsewhere, set `healthcheckPath` to match.

## Phase 2 — Secrets & env matrices
1. Generate real secrets: `node scripts/generate-secrets.mjs --write` (already in repo). Move values into Railway/Vercel env stores; never commit.
2. **Railway (API) env:** `DATABASE_URL`(from Railway Postgres), `NODE_ENV=production`, `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `COOKIE_DOMAIN=.<root>`, `CORS_ORIGINS=https://admin.<root>,https://agency.<root>,https://app.<root>,https://apps.<root>,https://tools.<root>`, `NOVA_INSTALL_CONFIRM_SECRET`, `NOVA_INGRESS_HMAC_SECRET`, `NOVA_DEFAULT_AGENCY_SLUG=nova`, `NOVA_ENTITLEMENT_SECRET`, `NOVA_BRIDGE_SECRET`, `SHOPIFY_API_VERSION`, plus (when ready) `SHOPIFY_PARTNER_*`, `STRIPE_*`.
3. **Vercel (each frontend) env:** `NEXT_PUBLIC_API_URL=https://api.<root>/v1` and any app‑specific `NEXT_PUBLIC_*` (e.g. `NEXT_PUBLIC_APP_HOST`). These are build‑time → redeploy after changes.
4. The two shared secrets (`NOVA_INSTALL_CONFIRM_SECRET`, `NOVA_INGRESS_HMAC_SECRET`) must equal Encore's values.

## Phase 3 — Local production dry run (catch issues before cloud)
1. `pnpm install && pnpm build` — all 6 packages build clean (proves the Vercel/Railway build will).
2. Against a scratch Postgres (local Docker or a Railway dev DB): `DATABASE_URL=… pnpm --filter @nova/database run migrate:deploy:ci && … run seed:ci` — proves migrations + seed apply to a real Postgres.
3. `node apps/api/dist/main.js` with prod‑like env → hit `/v1/health` and a login → confirms cookie is set with `Domain=.<root>`.
4. `pnpm --filter api test` green.

## Phase 4 — Ops basics (light, before real traffic)
- Confirm Railway healthcheck passes and auto‑restart works.
- Turn on Railway + Vercel log drains or at least bookmark the dashboards.
- Schedule the two crons (Encore `/cron/nova-outbox`; Nova nightly `reconcile` + `reprocess-failed`) — see go‑live checklist.

## Exit criteria (ready to run DEPLOY‑03)
- [ ] Phase 1 changes committed; `pnpm build` + `pnpm typecheck` + `pnpm test` green.
- [ ] Root domain chosen; Node pinned.
- [ ] Phase 3 dry run passed (migrate deploy + seed on a real Postgres; login sets a `.<root>` cookie).
- [ ] Secrets generated and ready to paste into Railway/Vercel.
