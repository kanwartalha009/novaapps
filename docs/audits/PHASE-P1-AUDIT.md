# Post-P1 Audit (2026-06-14)

Gate audit for **Phase P1** (correctness fixes + first migration + v2 data model + App distribution + RBAC + apps-registry/availability/stores + frontend data layer). Run per `07-quality/audit-mechanism.md`. **Verdict: PASS — cleared to start P2.** No invariant violations. Money/Store-Bridge/entitlement invariants are *N/A-until-their-phase* (no such code exists yet, by design).

## Verified on real infrastructure (Kanwar's Mac)
- `pnpm --filter @nova/database run migrate:dev --name v2_tools_billing_bridge` — **first migration applied clean** (creates v1 + v2 tables).
- `pnpm --filter @nova/database run seed` — succeeds (admin, Encore demo, bulk-editor tool granted to `nova`).
- `pnpm typecheck` — **green across all packages** (after fixing: zodParse output-type inference; startTransition void-return; env-loading).
- Schema validated structurally in-sandbox (Prisma WASM): **0 errors**, 60 models+enums.

## A — Invariant audit (`CHANGE-CONTROL.md`)
| Inv | Result | Evidence |
|---|---|---|
| I-1 monorepo layout | ✅ PASS | `apps/{api,web,admin,agency,app-admin}` + `packages/{database,shared,tsconfig}` |
| I-2 single API (no UI→DB) | ✅ PASS | grep: **no** `@nova/database` import in web/admin/agency/app-admin |
| I-3 platform-schema-only | ✅ PASS | all platform models in `packages/database`; product repos own theirs (reworded I-3) |
| I-4 module boundaries | ⚠️ convention | DAG respected by inspection; **no automated ESLint boundary rule yet** (flag P1-1) |
| I-5 money ledgers append-only | ◻︎ N/A→P2/P6 | no money write-paths exist yet; schema models present, no update/delete code |
| I-6 webhook-sourced revenue | ◻︎ N/A→P2/P6 | ingress implemented; no revenue derivation code yet |
| I-8 immutable referral | ✅ PASS | `installations.service.confirmInstall` sets `agencyId` only on create, never updates |
| I-10 RBAC server-side | ✅ PASS | `PermissionsGuard` global (after JwtAuthGuard); 10 `@RequirePermissions`; **no unguarded admin route** (grep) |
| I-11 two product classes | ✅ PASS | `Tool`/`ToolPlan` in schema; class fixed at creation; tools-registry specّd (code P3) |
| I-12 entitlements authority | ◻︎ N/A→P3 | `Entitlement` model + seed; resolver code lands P3 |
| I-13 Store Bridge only path | ◻︎ N/A→P5 | no tool backends yet; `stores`/`apps-registry` views never serialize tokens/`*Enc` |
| I-14 ledgers never mix | ✅ PASS | App-revenue and Tool-revenue tables are separate; no shared rows/joins |

## B — Spec-vs-code drift
- **Modules ↔ specs:** API module dirs `{agencies, apps-registry, auth, availability, billing, commissions, health, installations, payouts, rbac, stores, users, webhooks}` are a **subset** of `03-modules/*.md`. Specs ahead of code = `engine, entitlements, metering, store-bridge, subscriptions, tool-engine, tools-registry` (planned P3–P6) — expected, not drift. `health` is infra (no spec, acceptable). ✅
- **Endpoints ↔ controllers (spot-check):** `apps-registry` (CRUD/publish/plans + `/catalog/apps`), `availability` (`GET/PUT /admin/availability/:type/:id`), `stores` (`/agencies/me/stores` + `/admin/stores`) match their specs. ✅
- **Schema ↔ domain-model:** v2 entities present in both; `commissionModel` (not `commissionType`) reconciled across docs; `commissionBasis` default NET aligned. ✅

## C — Money reconciliation
◻︎ **N/A this phase.** No charge/commission/subscription/usage code exists yet. Harness to be built with P2 (App money) and P6 (Tool money) per `audit-mechanism.md §C`. (flag P1-2)

## D — Security & access
- **Secrets at rest:** `common/crypto.ts` AES-256-GCM (`APP_ENCRYPTION_KEY`); app secrets stored `*Enc`, never returned (views expose only `hasApiSecret`/`hasWebhookSecret`); store access tokens never serialized. ✅
- **RBAC matrix:** permissions seeded (incl. v2 `tools:*`, `availability:write`, `subscriptions:read`, `metering:read`); enforced server-side. ✅
- **Store Bridge blast radius:** ◻︎ N/A→P5.
- **AuditLog:** model present; `availability.set` writes a row. Broaden coverage as privileged actions land (P2+).

## P1 exit gate (`06-plan/phased-plan.md`)
- ✅ `prisma migrate` clean on a real DB.
- ✅ A published app is **availability-filtered** into the agency catalog (`/catalog/apps` + `availability.isAvailable`); seed proves the data path.
- ◻︎ **Live install on a real dev store** + forwarded event in ingress = the Encore Phase-0 e2e; code is complete (install-confirm + ingress implemented) but the live run needs the running Encore app + dev store on Kanwar's machine (carry-forward, not a P1 blocker).

## Flags raised (carry into P2)
- **P1-1** Add an ESLint module-boundary rule to automate I-4 (currently convention only).
- **P1-2** Build the money-reconciliation harness with P2.
- **P1-3** Build the **admin agencies-list endpoint** early in P2 — unblocks the agency approval flow *and* the deferred app-detail availability tab (+ `getAppBySlug`).
- **P1-4** `apps/admin/.../apps/[slug]` (app-detail) remains on fixtures — wire in P2 once money/events/support/engine + agencies-list endpoints exist.

## Verdict
**P1 PASS.** All applicable invariants hold; no drift; security basics in place. Proceed to **P2 — App money path** (`billing` charge ledger + `commissions` PERCENT/FLAT + dashboards), addressing P1-1..P1-4 along the way.
