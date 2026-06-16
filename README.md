# Nova Apps Platform

Platform for creating, distributing, and monetizing two product classes for Shopify — **Apps** (merchant-installed, Shopify-billed, agency earns commission) and **Tools** (agency-paid: freemium/premium/metered/per-store via Stripe) — through an agency channel.

**Read first:** `docs/00-overview.md` → `docs/audits/2026-06-14-architecture-overhaul.md` → `docs/CHANGE-CONTROL.md` → `docs/06-plan/phased-plan.md`

## Layout

```
apps/
  api/        NestJS API — all business logic (Railway, :4000)
  web/        Marketing site + catalog (Vercel, :3000)
  admin/      Admin Shell — govern agencies/apps/tools/money (Vercel, :3001)
  agency/     Agency surface — installs (earn) + tool activations (pay), [slug] subdomains (:3002)
  app-admin/  App Shell — per-app builder/console, [app-slug] subdomains (:3003)
  tool-admin/ Tool Shell — per-tool builder/console, [tool-slug] subdomains (:3004)  ← v2, to build
packages/
  database/   Prisma — PLATFORM schema only (products own their own schemas/DBs)
  shared/     Types, zod schemas, permission constants, FX_* fixtures
  tsconfig/   Shared TS configs
docs/         Specs — the contract for all changes (see docs/00-overview.md for the map)
```

> Apps/Tools are **standalone repos with their own DB**; the platform stores metadata + credentials only. The Shells build/orchestrate them — they don't host them.

## Quick start

```bash
pnpm install
cp .env.example .env          # fill DATABASE_URL
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Web: http://nova-apps.localhost:3000
- Admin: http://admin.nova-apps.localhost:3001 — login `admin@nova-apps.dev` / `admin12345` (seeded)
- Agency: http://[slug].nova-apps.localhost:3002 — create one via the web signup page
- API: http://localhost:4000/v1/health

## Rules of the repo

1. Specs in `docs/` are authoritative. Code follows spec, not the reverse.
2. Changes are classified C1/C2/C3 per `docs/CHANGE-CONTROL.md` before implementation (invariants I-1…I-14).
3. Frontends never touch the database; everything goes through the API.
4. Money tables are append-only ledgers; App revenue (Shopify→commission→payout) and Tool revenue (Stripe subscriptions/metering) never mix (I-14).
5. Tools reach stores only through the Store Bridge (I-13); tool access is gated by entitlements (I-12).
