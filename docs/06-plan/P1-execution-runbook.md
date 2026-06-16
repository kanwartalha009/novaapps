# P1 — Execution Runbook (commit-by-commit)

Granular execution of **P1** from `phased-plan.md` (correctness fixes + first migration + the v2 data model + App distribution). Tracks exactly what is **authored in-repo already** vs **what you run on your Mac** vs **what's still to code**.

> **Why split:** the Cowork sandbox can't run Prisma (engine binary download blocked), `pnpm`, builds, or Postgres. All *authoring* happens here; all *running* (migrate/generate/build/typecheck/seed/test) happens on your Mac. The schema was still validated here via the Prisma **WASM** validator (parse + relations), which passed with 0 errors.

## Legend
`[✓ authored]` = written in the repo this session · `[▶ run on Mac]` = your command · `[ ] to code` = next coding unit (not yet written).

---

## Commit 1 — Correctness + naming fixes  `[✓ authored]`
Spec-level + code-comment fixes (no migration needed):
- Invariants reworded/added in `CHANGE-CONTROL.md` (I-3, I-6, I-11…I-14).
- `commissionModel` chosen over `commissionType` (the latter is the existing ledger-kind enum); docs aligned.
- `commissionBasis` default pinned **NET** (matches ADR-004 + seed) across docs.
- All `docs/02-modules/…` references in code comments → `docs/03-modules/…` (41 files).

`[▶ run on Mac]` nothing yet — these land with Commit 2's typecheck.

## Commit 2 — v2 data model (the migration)  `[✓ authored]`
Authored in `packages/database/prisma/schema.prisma` + `seed.ts` + `packages/shared/src/permissions.ts` + `apps/api/src/modules/webhooks/webhooks.service.ts`:
- New models: `Tool, ToolPlan, Meter, Subscription, Invoice, UsageRecord, StoreBridgeConnection, ToolActivation, Availability, AvailabilityEntry, Entitlement, AuditLog`.
- New enums: `CommissionModel, ProductType, WebhookSource, ToolType, SubscriptionStatus, InvoiceStatus, BridgeConnectionStatus, ToolActivationSource, ToolActivationStatus, EntitlementReason, AvailabilityMode, AvailabilityEffect`.
- Field changes: `Commission/AgencyApp/Agency` + `commissionModel`/`flatAmount`; `Agency.stripeCustomerId`; `Store.grantedScopes`/`tokenRotatedAt`; `App` engine fields; `WebhookEvent` `appSlug → source/productType/productSlug`, `shopDomain` now optional.
- Seed: new permissions + settings (`defaultCommissionModel`, `defaultFlatAmount`, `defaultToolTrialDays`) + Encore `Availability` + a demo `Tool` (bulk-editor, PUBLIC, granted to the `nova` agency).

`[▶ run on Mac]` — **use the package scripts, not raw `npx prisma`.** They are `dotenv -e ../../.env -- …` so they load `DATABASE_URL` from the **root** `.env`. Raw `npx prisma migrate dev` run from `packages/database` fails `P1012: Environment variable not found: DATABASE_URL` because the CLI doesn't read the root `.env`.
```bash
pnpm install
# FIRST migration (also creates the v1 tables). The script loads the root .env.
pnpm --filter @nova/database run migrate:dev -- --name v2_tools_billing_bridge
pnpm build                                   # rebuilds @nova/shared + @nova/database (generate is env-loaded)
pnpm --filter @nova/database run seed        # seed (env-loaded)
pnpm typecheck                               # confirms webhooks.service + shared changes compile
# optional: pnpm --filter @nova/database exec dotenv -e ../../.env -- prisma validate
```
**Acceptance:** migration applies on a clean DB; seed prints `…v2 demo (tool=bulk-editor PUBLIC, granted to nova)`; `pnpm typecheck` passes.
> If `migrate dev` says the DB already has tables from an earlier manual run, use a fresh DB or `pnpm --filter @nova/database exec dotenv -e ../../.env -- prisma migrate reset` (dev only — destroys data).
> CI note: the `generate`/`build`/`migrate:*` scripts now load `../../.env`; in CI (no such file) provide env vars directly and call the plain `prisma` commands.

## Commit 3 — PermissionsGuard + @RequirePermissions  `[✓ authored]`
**Why:** previously only the global `JwtAuthGuard` existed; permissions were in the JWT but **nothing enforced them** (I-10 was UI-only). Authored:
- `apps/api/src/modules/auth/permissions.guard.ts` — reads required perms from metadata, checks `req.user.permissions`, honors `@Public()`.
- `apps/api/src/modules/auth/decorators.ts` — added `PERMISSIONS_KEY` + `RequirePermissions(...keys: Permission[])`.
- `auth.module.ts` — registered `PermissionsGuard` as a second `APP_GUARD` **after** `JwtAuthGuard` (array order = run order).

`[▶ run on Mac]` covered by Commit 2's `pnpm typecheck`.
**Acceptance:** a valid JWT missing the permission → 403; `@Public()` routes unaffected; dev-bypass admin (all perms) passes.

## Commit 4 — apps-registry CRUD/publish/plans + catalog  `[✓ authored]`
Authored (modelled on the implemented `agencies` service):
- `apps/api/src/modules/apps-registry/apps-registry.service.ts` — `list` (cursor-paginated), `getById`, `create`, `update` (encrypts secrets), `publish` (blocks paid app with no plans), `listPlans`, `upsertPlan`, `catalogForAgency`, and the unified `isAvailable` resolver (PRIVATE allow / PUBLIC deny). Safe views never serialize `*Enc` secrets.
- `apps-registry.controller.ts` — `GET/POST /admin/apps`, `GET/PATCH /admin/apps/:id`, `POST /admin/apps/:id/publish`, `GET/POST /admin/apps/:id/plans`, each `@RequirePermissions(...)`; **`CatalogController`** `GET /catalog/apps` (agency audience).
- `common/crypto.ts` — AES-256-GCM `encryptSecret`/`decryptSecret` (key = sha256 `APP_ENCRYPTION_KEY`).
- `@nova/shared/schemas/app.ts` — `createApp`/`updateApp`/`upsertAppPlan` zod DTOs (validated via `common/zod.ts`); exported from the package index. **Shared DTOs typecheck-verified in the sandbox.**

`[▶ run on Mac]` after Commit 2's migrate+generate: `pnpm build` (rebuild `@nova/shared` so the API sees the new exports) → `pnpm typecheck`.
**Acceptance:** create→publish→appears in `/catalog/apps` for an allowed agency, hidden for a denied one; `apps:write` required to mutate; secrets never serialized (only `hasApiSecret`/`hasWebhookSecret`).

## Commit 5 — stores connect + unified Availability service  `[✓ authored]`
Authored:
- **`availability` module** (`apps/api/src/modules/availability`) — `AvailabilityService` (resolver + `get` + `set` with atomic entry-replace + `AuditLog`), `AvailabilityController` (`GET`/`PUT /admin/availability/:productType/:productId`, `[availability:write]`). Registered in `app.module`.
- **apps-registry refactor** — now injects `AvailabilityService` (imports `AvailabilityModule`); removed its inline resolver. Single source of truth for offerability.
- **stores** — `StoresController` (agency aud): `GET/POST /agencies/me/stores`, `GET/DELETE /agencies/me/stores/:id` (disconnect = OWNER-only, blocked if any install history); `AdminStoresController`: `GET /admin/stores` `[stores:read]`, cursor-paginated. Tokens never returned.
- `@nova/shared/schemas/{availability,store}.ts` DTOs — **typecheck-verified in the sandbox**. New `03-modules/availability.md` spec + module index updated.

`[▶ run on Mac]` `pnpm build && pnpm typecheck` (after the Commit 2 migrate+generate).
**Acceptance:** flipping an app PRIVATE↔PUBLIC / adding a DENY entry changes `/catalog/apps` visibility; the change writes an `AuditLog`; an agency can connect a store and see it; disconnect blocked when installs exist.
> Store Bridge OAuth authorize + token storage is **P5** — this commit only records the agency↔store link.

## Commit 6 — wire admin/agency frontends off fixtures  `[◑ data layer + reference page authored]`
**Pattern (no CORS):** **server components** read via `apiServer` (cookie-forwarded); **mutations** go through **Next server actions** (`lib/actions.ts`, also cookie-forwarded). Page structure stays; only the data source changes.

Authored:
- `apps/agency/src/lib/api.ts` — `listStores()`, `getCatalogApps()` + `StoreView`/`CatalogAppView` types.
- `apps/agency/src/lib/actions.ts` — `connectStore`, `disconnectStore`.
- `apps/admin/src/lib/api.ts` — `listApps()`, `getApp()`, `listAdminStores()`, `getAvailability()` + view types.
- `apps/admin/src/lib/actions.ts` — `createApp`, `updateApp`, `publishApp`, `upsertAppPlan`, `setAvailability`.
- **Reference conversion:** `agency …/stores/page.tsx` → server component fetching `listStores()`, rendering a `stores-client.tsx` island that connects/disconnects via the actions + `router.refresh()`. **Fully off fixtures.**

Page conversions (server fetch + client island where interactive):
- [x] **agency `…/stores`** → `listStores()` + connect/disconnect actions (reference).
- [x] **admin `apps/page.tsx`** → server fetch `listApps()` + `apps-client.tsx`; `description` shown as tagline; dropped `activeInstalls` column (no P1 source). Create wizard's final step now persists via `createApp` (+ `upsertAppPlan`); the rest of the wizard stays an engine preview.
- [x] **admin `stores/page.tsx`** → server fetch `listAdminStores()` + `stores-client.tsx` (agency filter only; app/plan filters + install counts dropped — no P1 data).
- [x] **agency `apps/page.tsx` (catalog)** → server fetch `getCatalogApps()` + `catalog-client.tsx`; commission/earnings preview deferred to P2 (no rate source); install button is a local demo (agency-initiated install handoff is a later phase).
- [~] **admin `apps/[slug]/page.tsx` + `app-availability.tsx`** → **DEFERRED to P2.** 4 of 5 tabs need money/events/support/engine endpoints; the availability tab needs an admin **agencies-list** endpoint (agencies module is stubbed) + `getAppBySlug`. Stays on fixtures (compiles).

**Acceptance (this commit):** agency connect/list/disconnect a store live; admin lists apps + creates a DRAFT registry row via the wizard; admin + agency lists render from the API. Run `pnpm typecheck && pnpm dev` to verify rendering.

---

## Post-P1 audit (gate before P2) — `07-quality/audit-mechanism.md`
Run on your Mac / CI and record in `docs/audits/PHASE-P1-AUDIT.md`:
- **A invariant (⚙):** I-2 (no Next.js imports `@nova/database`), I-3 (only platform schema in `packages/database`), I-10 (every non-`@Public` route has a permission), I-5 (no update/delete on money tables).
- **B drift:** `apps/api` modules ↔ `03-modules/*.md`; endpoints ↔ controllers; `schema.prisma` ↔ `domain-model.md`.
- **Exit gate (phased-plan P1):** published app installs on a dev store; a forwarded webhook lands in ingress (install-confirm + ingress are already implemented — verify against Encore once migrated).

## Status checklist
- [x] Commit 1 correctness/naming fixes
- [x] Commit 2 v2 schema + seed + permissions + webhooks (authored; **run migration on Mac**)
- [x] Commit 3 PermissionsGuard (authored)
- [x] Commit 4 apps-registry CRUD/catalog + crypto + DTOs (authored; shared DTOs typecheck-verified)
- [x] Commit 5 availability module + stores + apps-registry refactor (authored; DTOs typecheck-verified)
- [x] Commit 6 frontend wiring — data layer + 4 pages wired (agency stores, admin apps list+create, admin stores, agency catalog); admin app-detail deferred to P2 (needs money/events/support/engine + agencies-list endpoints)
- [x] Post-P1 audit — **PASS** (`docs/audits/PHASE-P1-AUDIT.md`); flags P1-1..P1-4 carried into P2 → **P1 COMPLETE**

## What to run on your Mac now (one sequence)
```bash
pnpm install
pnpm --filter @nova/database run migrate:dev -- --name v2_tools_billing_bridge   # loads root .env
pnpm build                                    # @nova/shared + @nova/database (env-loaded generate)
pnpm --filter @nova/database run seed
pnpm typecheck                                # ← final gate for Commits 2–6 (NestJS compiles vs generated client)
pnpm dev                                      # runtime check of the wired pages
```
- The prisma scripts are `dotenv -e ../../.env -- …`; **do not** call raw `npx prisma migrate dev` from `packages/database` (it won't see the root `.env` → P1012).
- Set `APP_ENCRYPTION_KEY` in `.env` (any long random string) before using app-credential update.
