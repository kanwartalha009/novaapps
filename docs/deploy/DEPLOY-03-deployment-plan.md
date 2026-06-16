# DEPLOY‑03 — Deployment Plan (step by step)

**Date:** 2026-06-15 · **Prereqs:** DEPLOY‑01 Phase 1–3 done (code committed, dry run passed); DEPLOY‑02 accounts created.
Throughout, `<root>` = your chosen domain (e.g. `nova.app`). Do the steps in order.

## Step 1 — Push the repo
- [ ] `pnpm install` (refresh lockfile) → commit → push the platform monorepo to GitHub.
- [ ] Confirm `main` is green locally: `pnpm typecheck && pnpm test && pnpm build`.

## Step 2 — Provision Postgres (Railway)
- [ ] In the Railway project, open the **Postgres** plugin → Connect → copy the connection string.
- [ ] Save it as the API service's `DATABASE_URL` (Step 3). Use the **private** URL for the API (same project network); the public URL only for the one‑off seed if you run it from your laptop.

## Step 3 — Deploy the API (Railway)
- [ ] Point the Railway service at the repo; it reads `railway.json` (DEPLOY‑01 §1.3).
- [ ] Set API env vars (DEPLOY‑01 Phase 2): `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `COOKIE_DOMAIN=.<root>`, `CORS_ORIGINS=https://admin.<root>,https://agency.<root>,https://app.<root>,https://apps.<root>,https://tools.<root>`, `NOVA_INSTALL_CONFIRM_SECRET`, `NOVA_INGRESS_HMAC_SECRET`, `NOVA_DEFAULT_AGENCY_SLUG=nova`, `NOVA_ENTITLEMENT_SECRET`, `NOVA_BRIDGE_SECRET`, `SHOPIFY_API_VERSION=2025-01`. Leave `AUTH_DEV_BYPASS` unset.
- [ ] Deploy. The build runs `turbo build --filter=api...`; `preDeployCommand` runs `migrate:deploy:ci` (applies the 3 committed migrations).
- [ ] **Seed once** (creates permissions, SUPER_ADMIN, settings, admin user, Encore demo). From the Railway service shell (or locally against the public `DATABASE_URL`):
  `pnpm --filter @nova/database run seed:ci`
  Then immediately change the admin password (don't ship `admin12345`).
- [ ] Verify: `https://<temp-railway-url>/v1/health` returns OK and logs show "API listening on :<port>".

## Step 4 — API custom domain + DNS
- [ ] Railway service → Settings → Networking → add custom domain `api.<root>`.
- [ ] Add the CNAME it gives you at your DNS (Cloudflare). If proxying through Cloudflare, set SSL mode **Full (strict)**.
- [ ] Confirm `https://api.<root>/v1/health` is green.

## Step 5 — Deploy the 5 frontends (Vercel)
For each app (`web`→`app`, `admin`→`admin`, `agency`→`agency`, `app-admin`→`apps`, `tool-admin`→`tools`):
- [ ] Create the project (DEPLOY‑01 §1.4 settings): Root `apps/<app>`, Install `cd ../.. && pnpm install --frozen-lockfile`, Build `cd ../.. && pnpm turbo run build --filter=<app>...`.
- [ ] Env: `NEXT_PUBLIC_API_URL=https://api.<root>/v1` (+ any app‑specific `NEXT_PUBLIC_*`).
- [ ] Deploy; confirm the temp `*.vercel.app` loads.
- [ ] Add the custom subdomain (Project → Domains): `admin.<root>`, `agency.<root>`, `app.<root>`, `apps.<root>`, `tools.<root>`; add the CNAMEs at DNS.

Suggested subdomain map (adjust to taste): `app`=web/public, `admin`=platform admin, `agency`=agency portal, `apps`=app‑admin (App Shell), `tools`=tool‑admin (Tool Shell).

## Step 6 — Wire CORS + cookies, redeploy API
- [ ] Confirm `CORS_ORIGINS` (Step 3) exactly matches the live frontend origins (scheme + host, no trailing slash).
- [ ] Confirm `COOKIE_DOMAIN=.<root>`.
- [ ] Redeploy the API so both take effect.

## Step 7 — Smoke test (the real go/no‑go)
- [ ] `GET https://api.<root>/v1/health` → 200.
- [ ] Open `https://admin.<root>`, log in → DevTools shows the access cookie set on `Domain=.<root>`; a refresh keeps you signed in (proves cross‑subdomain cookie auth).
- [ ] Admin loads real data (apps, agencies, stores) from `api.<root>` with **no CORS errors** in console.
- [ ] Create an app / edit a plan from admin → persists (proves write path + RBAC).
- [ ] Webhook ingress: send a signed test to `POST https://api.<root>/v1/webhooks/shopify/encore` → 200 on valid HMAC, 401 on a bad one.
- [ ] `https://agency.<root>` loads the catalog for a logged‑in agency.

## Step 8 — Point Encore at production
- [ ] In Encore's env: `NOVA_API=https://api.<root>` and the **same** `NOVA_INSTALL_CONFIRM_SECRET` / `NOVA_INGRESS_HMAC_SECRET` as Railway.
- [ ] Redeploy Encore (its own host). Schedule `POST https://<encore>/cron/nova-outbox` every 1–2 min.
- [ ] Run the Encore pilot test (R‑golive runbook): install via `?ref=` link → subscribe → confirm a Charge + Commission appear in admin at `api.<root>` → uninstall → accrual stops.

## Step 9 — Scheduled jobs
- [x] **Platform jobs run in‑process** on the always‑on API — no external cron needed: `reprocessFailed` (15m), `reconcileFromPartner` + `commissions.autoApproveMatured` (6h). They start automatically on boot (`JobsModule`). Controlled by `JOBS_ENABLED` (default on; set `false` on any extra instance when scaling past one).
- [ ] **Encore outbox** still needs an external scheduler (Encore is request‑driven, not always‑on): `POST https://<encore>/cron/nova-outbox` every 1–2 min with `Authorization: Bearer $ENCORE_CRON_SECRET`.

## Rollback & safety
- **API:** Railway → Deployments → Redeploy the previous build (instant). Migrations are forward‑only; never edit an applied migration — add a new one.
- **Frontends:** Vercel → Deployments → Promote the previous deployment (instant).
- **DB:** enable Railway Postgres backups before first real traffic; take a manual snapshot before any migration that drops/renames columns.
- **DNS:** keep TTL low (300s) during cutover so changes propagate fast.

## Definition of done
- [ ] All 5 frontends live on their subdomains; API live on `api.<root>` (health green).
- [ ] Login works cross‑subdomain; admin reads/writes with no CORS errors.
- [ ] Migrations applied; seed run; admin password rotated; `AUTH_DEV_BYPASS` off.
- [ ] Encore points at `api.<root>` and the pilot chain (attribution → charge → commission → stop‑on‑uninstall) passes end‑to‑end.
