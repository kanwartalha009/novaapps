# P2 — Execution Runbook (App money path)

Granular execution of **P2** from `phased-plan.md`: the **App revenue ledger → commissions** (Direction A in `money-flows.md`), plus the four flags carried from `audits/PHASE-P1-AUDIT.md`. Same conventions as P1: author here, run `pnpm typecheck`/`migrate`/`dev` on the Mac. `[✓ authored]` / `[▶ run on Mac]` / `[ ] to code`.

> No schema migration needed for the core money path — `Charge`/`Commission`/`Payout` + `commissionModel`/`flatAmount` all landed in the P1 v2 migration. P2 is service + endpoint + UI work.

## Commit 1 — billing: Charge ledger + webhook wiring  `[✓ authored]`
- `billing.service`: idempotent `recordCharge` (unique `externalId`), resolves the ACTIVE `Installation` for `(appSlug, shopDomain)`, writes a `Charge` (`SUBSCRIPTION`/`ONE_TIME`/`USAGE`/`REFUND`), emits **`charge.recorded`** (`EventEmitter2`). Admin list (cursor + filters) + agency-scoped reads.
- `webhooks.service`/`module`: route `app_subscriptions/update` + `app_purchases_one_time/update` + refund topics → `billing.record*`; `webhooks` now imports `BillingModule`.
- **Payload mapping is defensive** (amount/currency/external-id extracted with documented fallbacks) — confirm exact Shopify fields against a real dev-store webhook (carry-forward from Encore P0).
**Acceptance:** a forwarded `app_subscriptions/update` creates exactly one `Charge` (idempotent on retry) and emits `charge.recorded`.

## Commit 2 — commissions: derive / approve / adjust / reverse  `[✓ authored]`
- `commissions.service`: `@OnEvent('charge.recorded')` → derive a `Commission` (PENDING), idempotent on `chargeId`. Rate/model resolution (assignment → agency → platform default), basis NET|GROSS (default NET), **PERCENT** (`round_half_even(basis·rateBps/10000)`) or **FLAT** (ADR-012); all snapshotted. `REFUND` charge → `REVERSAL` (negative), linked to the original when uniquely resolvable.
- `approve` / `adjust` (typed `ADJUSTMENT`, reason required) / `autoApproveMatured` (for the nightly job). Admin list + agency list + summary (pending/approved/paid).
- Adjust DTO in `@nova/shared`.
**Acceptance:** a test `charge.recorded` yields a correct PENDING commission with the right model/basis; approve → APPROVED; a refund yields a negative REVERSAL.

## Commit 3 — admin agencies-list endpoint  `[✓ authored]` (flag P1-3)
`agencies.service` + `AdminAgenciesController`: `GET /admin/agencies` (cursor + status filter, with `_count`), `GET /admin/agencies/:id`, `POST /admin/agencies/:id/approve|suspend|reactivate` `[agencies:read|write]`. Unblocks the agency approval flow **and** the deferred app-detail availability tab. Also added `apps-registry.getBySlug` + `GET /admin/apps/by-slug/:slug` (slug-keyed detail page).

## Commit 4 — money dashboards + wire app-detail + CSV  `[◑ backend + 2 dashboards authored]` (flag P1-4)
**Backend authored:** CSV statement; `getAppBySlug`; commissions list now includes `agency` + `store`; admin/agency api readers + admin actions (`approveCommission`, `adjustCommission`, `approveAgency`).
**Frontend authored:**
- **agency `/commissions`** → server-rendered from `listCommissions` + `getCommissionSummary`; **Export CSV** via a same-origin route handler (`/api/commissions-statement`) that forwards the cookie.
- **admin `/commissions`** → server fetch + `commissions-client.tsx` island: inline **approve** + manual **ADJUSTMENT** slide-over (agency selector from `listAgencies`), both via server actions + `router.refresh()`.
**Frontend remaining `[ ] to code`:** admin `/charges` list, admin `/dashboard` revenue KPIs, and the `admin apps/[slug]` app-detail tabs (availability tab now fully supported). Best done with `pnpm dev` open.

## Commit 5 — reconciliation harness + ESLint boundary + audit  `[✓ authored]` (flags P1-2, P1-1)
- **Reconciliation harness** (`packages/database/scripts/reconcile-money.ts`, `pnpm --filter @nova/database run reconcile`): orphan-derived, ADJUSTMENT-no-charge, PAID-has-payout, reversals-negative, ≤1-commission-per-charge; CI-friendly exit code. (flag P1-2 ✓)
- **ESLint boundary (flag P1-1):** no root eslint config exists yet → recipe documented in `audits/PHASE-P2-AUDIT.md`; apply when lint config is standardized. (carry)
- **`docs/audits/PHASE-P2-AUDIT.md`** — PASS.

## Run on your Mac (after Commits 1–2)
```bash
pnpm build && pnpm typecheck
# exercise locally: forward a sample app_subscriptions/update to /v1/webhooks/shopify/encore (signed),
# then check /v1/admin/charges and /v1/admin/commissions
```

## Status
- [x] Commit 1 billing ledger + webhook wiring (authored, typecheck-green)
- [x] Commit 2 commissions derive/approve/adjust/reverse (authored, typecheck-green)
- [x] Commit 3 admin agencies-list + getAppBySlug (authored)
- [x] Commit 4 — money dashboards (agency earnings, admin commissions, admin charges, admin dashboard KPIs) + app-detail rewrite (real availability matrix) + CSV
- [x] Commit 5 — reconciliation harness + post-P2 audit (ESLint boundary recipe documented; carry P1-1)

**P2 COMPLETE** (pending Mac `pnpm typecheck` of the final frontend batch + the real-payload spike P2-1 for live charges). → cleared for **P3 (Tool track)**.
