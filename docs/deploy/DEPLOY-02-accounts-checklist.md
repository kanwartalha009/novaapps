# DEPLOY‑02 — Accounts & Services Checklist

**Date:** 2026-06-15 · **Read order:** DEPLOY‑01 → this → DEPLOY‑03.
Create these in order. For each, the **grab** column is the value you'll paste into Railway/Vercel later (DEPLOY‑03).

## Required for the platform itself

### 1. GitHub
- [ ] Create a repo for the Nova platform (e.g. `kanwartalha009/nova-platform`), push the monorepo.
- [ ] Confirm `pnpm-lock.yaml` is committed and up to date (`pnpm install` first).
- **Grab:** repo URL (Railway + Vercel both deploy from it).
- Note: `shopify/encore` is its own repo already (`kanwartalha009/encore`) — deployed separately.

### 2. Domain registrar (REQUIRED — see DEPLOY‑01 Blocker B2)
- [ ] Buy your root domain (Porkbun or Cloudflare Registrar — at‑cost pricing).
- [ ] (Recommended) Add the domain to **Cloudflare DNS** for fast, free DNS management.
- **Grab:** the root domain (e.g. `nova.app`) and DNS access.
- Why first: cookie auth needs API + frontends under one root domain, and DNS records are needed in DEPLOY‑03.

### 3. Railway (API + Postgres)
- [ ] Sign up at railway.app, connect GitHub.
- [ ] Create a **Project**; add a **PostgreSQL** plugin (managed Postgres).
- [ ] Add a **Service** from the GitHub repo (the API).
- [ ] Note the Postgres connection string and the service's public URL.
- **Grab:** `DATABASE_URL` (from the Postgres plugin → Connect), and the temporary `*.up.railway.app` API URL (replaced by `api.<root>` later).
- Plan: Hobby is fine to start; upgrade when you add real traffic.

### 4. Vercel (5 frontend projects)
- [ ] Sign up at vercel.com, connect the **same** GitHub repo.
- [ ] Create **5 projects** from the repo, one per app: `web`, `admin`, `agency`, `app-admin`, `tool-admin` (settings in DEPLOY‑01 §1.4).
- **Grab:** the 5 project names; the temporary `*.vercel.app` URLs (replaced by custom subdomains later).

## Required before real money / live apps (can follow the pilot)

### 5. Shopify Partner API client (authoritative billing)
- [ ] In your existing Shopify Partner org → Settings → Partner API clients → create one with **View financials** + **Manage apps**.
- **Grab:** `SHOPIFY_PARTNER_ORG_ID` (in the dashboard URL), `SHOPIFY_PARTNER_API_TOKEN`, and your app's `NOVA_SHOPIFY_APP_GID`.
- Used by `POST /v1/admin/charges/reconcile` once you flip `billingSourceOfTruth=partner`.

### 6. Stripe (Tools billing — only if launching Tools)
- [ ] Create a Stripe account; get test keys first.
- **Grab:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (after you create the webhook endpoint in DEPLOY‑03).
- Skip for an Apps‑only pilot.

## Recommended

### 7. Secret storage
- [ ] Decide where production secrets live. Railway/Vercel env stores are sufficient to start; a dedicated manager (1Password, Doppler) is better long‑term.
- [ ] Run `node scripts/generate-secrets.mjs --write` and load the values in (never commit `.env.secrets`).

### 8. Error tracking (optional, recommended)
- [ ] Sentry (or similar) project for the API + frontends — flagged as a post‑pilot item, not a blocker.

## Quick value‑capture table

| Service | What you create | Values to grab |
|---|---|---|
| GitHub | Platform repo | repo URL |
| Registrar/DNS | Root domain + DNS | `<root>` domain, DNS access |
| Railway | Project + Postgres + API service | `DATABASE_URL`, temp API URL |
| Vercel | 5 Next projects | 5 temp `*.vercel.app` URLs |
| Shopify Partner | API client | `SHOPIFY_PARTNER_ORG_ID`, `_API_TOKEN`, app GID |
| Stripe (opt) | Account + webhook | `STRIPE_SECRET_KEY`, `_WEBHOOK_SECRET` |
| Secrets | generate-secrets.mjs | `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `NOVA_*` shared |
