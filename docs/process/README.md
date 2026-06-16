# Nova — product-creation process (the repeatable runbook)

> How to take a **product (App or Tool)** from idea to published, end to end. **Encore**
> (`shopify/encore`) is the reference App this runbook is distilled from; the reference **Tool** is
> built in P4 (`06-plan/phased-plan.md`). Model: **standalone repo per product** — the platform owns
> metadata + money + availability; each product is its own repo wired to the platform via the
> integration contract (`X-Nova-Signature`).
>
> **v2 (2026-06-14):** Stage 1 (specs) is now performed by the **creation skills** (`09-skills/`):
> `nova-validator-app` / `nova-validator-tool` produce a Nova App/Tool Spec; `nova-spec-ingestor`
> turns it into seeders + the build-pack/delivery-plan/prerequisites. The five stages below apply to
> both classes; the **Tools variant** section notes where they differ. Architecture overhaul:
> `audits/2026-06-14-architecture-overhaul.md`.

## The model in one picture

```
Nova Apps Platform (this monorepo)                 Each Shopify app (its own repo)
──────────────────────────────────                ───────────────────────────────
apps/api      registry, installs, billing,         shopify/<slug>  (→ github.com/<org>/<slug>)
              commissions, payouts, webhooks         React Router app + extensions
apps/admin    operator console (:3001)               own prisma schema + migrations
apps/agency   agency dashboards (:3002)              own .env / Railway deploy
apps/app-admin app-builder / engine console (:3003)  wired to platform via X-Nova-Signature:
packages/database  platform Prisma (single schema)     • install-confirm  • webhook ingress
        ▲  metadata + credentials only                          │
        └──────────────────  signed HTTP  ───────────────────────┘
```

## The 5 stages

### 1. Specs ingestion
- **Goal:** turn an app idea into a self-contained **build pack** + **delivery plan** + **prerequisites**.
- **Where:** platform app-builder (`apps/app-admin` → Build) authors the blueprint (screens, backend
  entities, endpoints, webhooks, jobs, plans); the build-pack export renders one markdown doc Cowork builds from.
- **Deliverables (the Encore template):** `encore-BUILD-PACK.md` (config + conventions + screens with
  acceptance + backend + build order), `encore-DELIVERY-PLAN.md` (phase gating, guardrails, per-phase
  audit), `encore-PREREQUISITES.md` (accounts, toolchain, secrets, **blocking spikes**).
- **Exit:** all three docs exist; the hard/unknown parts are named as Phase-0 spikes.

### 2. App creation, build phases & agency availability (platform)
- **Register** the app (apps-registry): name, slug, description, plans, encrypted Shopify credentials,
  `status = DRAFT`, module manifest.
- **Build phase by phase** per the delivery plan (Encore: Phase 0→5). Each phase is done only when its
  gate is verified from real code/platform evidence **and** the post-phase audit is green; phases never
  reopen a frozen contract (that's a CHANGE-CONTROL C2/C3 event).
- **Agency availability:** an app becomes installable when it is `PUBLISHED` **and** has an `AgencyApp`
  opt-in for that agency. A per-install `planOverride` (`FREE`/`PERCENT`/`FIXED`) comps/discounts a store.
- **Exit:** app row (DRAFT) with plans + credentials; phase tracker started.

### 3. Shopify app creation
```bash
cd shopify
shopify app init --template reactRouter --name "<App>" --organization-id <PARTNER_ORG_ID> \
  --package-manager npm --path <slug>      # PARTNER_ORG_ID = the number in partners.shopify.com/<id>/
cd <slug>
# capture the returned client_id → record it on the platform App row
```
Then wire: `shopify.app.toml` (least-privilege scopes, app proxy `/apps/<slug>`, webhook subscriptions
incl. the GDPR three, `api_version`), embedded **token-exchange** auth, per-app **Postgres** Prisma schema,
and the Nova client (install-confirm + webhook forwarding, HMAC-signed).
- **Exit:** app scaffolded (TypeScript), Partner app created + `client_id` captured, toml/auth/schema wired.

### 4. Migrations & API
- **App DB:** `npx prisma migrate dev --name init` in the app repo (against `APP_DB_URL__<SLUG>`).
- **Platform API (the wiring):** the app calls `POST {NOVA_API}/v1/internal/installations/confirm`
  (install → `ACTIVE`, locks agency referral) and forwards `app/uninstalled`, `app_subscriptions/update`,
  and the GDPR three to `POST {NOVA_API}/v1/webhooks/shopify/<slug>` — both signed `X-Nova-Signature`
  per `NOVA-INTEGRATION-CONTRACT.md`. Charges → commissions derive in the platform ledger.
- **Exit:** app migrated; Installation shows `ACTIVE`; a forwarded event lands in the ingress log.

### 5. Publishing
- Tracked manual checklist (engine.md): **distribution choice (public/custom — irreversible)**, billing
  test, GDPR verification, listing draft, App Store review → `PUBLISHED`.
- **Defer distribution** until after the pilot/validation gate. Then the app appears in the agency catalog
  and can be installed.

## Tools variant (how the 5 stages differ for a Tool)
Same spine (standalone repo + own DB + integration contract), different switches (ADR-007):
1. **Specs** — `nova-validator-tool` → `nova-spec-ingestor`; pick `toolType` (AGENCY/STORE/HYBRID) and Store Bridge scopes.
2. **Create & availability** — register in the **Tools** pillar; build in the **Tool Shell** (`apps/tool-admin`); availability via the unified policy; activation = admin **grant** or agency **subscribe** (not a store install).
3. **Repo creation** — `tool-engine` scaffolds `nova-tool-template` (entitlement client + Store Bridge client if `usesStoreBridge` + usage reporter). No Shopify Partner app/`client_id` (a tool isn't installed); instead, **Stripe** products/prices/meters are created from `ToolPlan`.
4. **Migrations & API** — per-tool Postgres; wire **entitlement checks** (I-12), **Store Bridge** proxy calls (I-13) for store access, and webhook **relay** (`source=STORE_BRIDGE`). Tool money flows via `subscriptions` + `metering`, never the App ledger (I-14).
5. **Release** — checklist: Stripe live, entitlement checks verified, Bridge scopes approved, (store-facing) dev-store smoke test → PUBLISHED. Defer broad availability until the pilot gate.

See `05-product/tools.md`, `02-shells/tool-shell.md`, `03-modules/{tools-registry,tool-engine,store-bridge,subscriptions,metering,entitlements}.md`.

## Lessons from the Encore PoC (apply to every app)
- **pnpm 11 blocks dependency build scripts** → `shopify app init` rolls the scaffold back. Use
  `--package-manager npm` (or pin `pnpm@9.15.0` via corepack).
- The **org id** is the number in your Partners URL (`partners.shopify.com/1710157` → `1710157`), not a
  value from the spec (the specs used placeholders).
- The app is **its own repo** under your GitHub org; keep it **out of the platform git** (`/shopify/` is
  gitignored). Build it in **TypeScript** for the reliability-critical paths.
- **Define the platform↔app contract explicitly** (signing header, secrets, body) — the spec was
  contradictory; `NOVA-INTEGRATION-CONTRACT.md` is the resolved version.

## Current automation gaps → see `roadmap-to-real.md`
The platform is still a Phase-1 fixtures prototype: app registration, install-confirm, and webhook ingress
are **not built yet**, so Stage 4's end-to-end can't be verified against the live platform. The roadmap
sequences the work to make this process real.
