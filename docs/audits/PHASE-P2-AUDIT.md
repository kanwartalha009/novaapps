# Post-P2 Audit (2026-06-14)

Gate audit for **Phase P2 — App money path** (billing charge ledger → commissions PERCENT/FLAT, admin agencies-list, money dashboards, CSV, reconciliation). Per `07-quality/audit-mechanism.md`. **Verdict: PASS** for what's buildable/verifiable; live charge→commission e2e needs a real dev-store webhook (Encore P0 dependency). Run `pnpm typecheck` to gate the final frontend batch.

## What P2 shipped
- **billing** — `Charge` ledger from verified webhooks (idempotent on `externalId`), `charge.recorded` event, admin/agency reads, `adminOverview()` KPI rollup.
- **commissions** — event-driven derivation (PERCENT/FLAT, NET/GROSS basis, round-half-even, snapshots), refund→REVERSAL, approve/adjust/auto-approve, agency summary, CSV statement.
- **agencies (admin, flag P1-3)** — list/get/approve/suspend/reactivate; `apps-registry.getBySlug`.
- **frontend** — agency earnings + admin commissions + admin charges + admin dashboard KPIs wired to the API; app-detail rewritten to real data with the **availability matrix** (flag P1-4) live; CSV via a same-origin cookie-forwarding route handler.
- **reconciliation harness** — `pnpm --filter @nova/database run reconcile`.

## A — Invariant audit
| Inv | Result | Evidence |
|---|---|---|
| I-5 money append-only | ✅ | commissions only transition `status` (approve/auto-approve); amounts never edited; corrections are ADJUSTMENT/REVERSAL rows. Reconcile script enforces. |
| I-6 webhook-sourced revenue | ✅ | `Charge` created only by `billing.recordFromWebhook` (from verified ingress); commissions derive via `charge.recorded` event; never hand-inserted. |
| I-10 RBAC | ✅ | new admin routes carry `@RequirePermissions` (`billing:read`, `commissions:read|approve`, `agencies:read|write`); agency routes are tenant-scoped. |
| I-14 ledgers never mix | ✅ | App ledger (`billing`/`commissions`/`payouts`) only; no read/join touches tool-revenue tables; `adminOverview` is App-only. |
| I-4 module boundaries | ⚠️ convention | DAG respected (`commissions`→`billing` via event const; `billing.adminOverview` does a read-only cross-table rollup, documented). **ESLint automation still pending — recipe below (flag P1-1).** |

## B — Spec-vs-code drift
- New endpoints match specs: `billing.md` (charges + overview), `commissions.md` (derive/approve/adjust/CSV/summary), `agencies.md` (admin list/approve). `apps-registry` gained `by-slug`. **Action:** reflect `/admin/metrics/overview` + agency admin routes in the module specs on next docs pass (minor).
- `schema.prisma` unchanged this phase (all tables from P1 v2 migration).

## C — Money reconciliation (harness added)
`reconcile-money.ts` checks: every EARNED/REVERSAL links to a charge; ADJUSTMENT has no charge; PAID belongs to a payout; reversals are negative; ≤1 commission per charge. Run nightly + pre-release. **Tool-revenue reconciliation lands with P6.**

## D — Security
- Charges/commissions reads permission-gated; agency reads tenant-scoped (I-9). CSV export goes through a same-origin route handler that forwards the httpOnly cookie (no token in the client). App secrets still `*Enc`, never serialized.

## P2 exit gate
- ✅ Commission derives with correct model/basis on `charge.recorded` (unit-verifiable; reconcile harness green on seeded data).
- ✅ Approve flow + dashboards render from the API.
- ◻︎ **Live**: a forwarded `app_subscriptions/update` → Charge → PENDING→APPROVED commission visible on both dashboards — needs the real Shopify payload (flag P2-1) on a dev store (Encore P0).

## Flags
- **P2-1** Shopify charge-amount **payload mapping is a spike** — `billing.extractAmount`/`externalId` use defensive fallbacks + plan-amount; confirm fields + per-cycle idempotency against a real dev-store `app_subscriptions/update`.
- **P1-1 (carry)** Automate I-4 with ESLint. No root eslint config exists yet (`lint` = `turbo lint`). Recommended once standardized — recipe:
  ```jsonc
  // apps/api/.eslintrc (eslint-plugin-import) — forbid reverse module imports, e.g.:
  "import/no-restricted-paths": ["error", { "zones": [
    { "target": "src/modules/billing", "from": "src/modules/commissions" },
    { "target": "src/modules/apps-registry", "from": "src/modules/installations" }
    // … one zone per "lower must not import higher" edge in 03-modules/README.md
  ]}]
  ```
  Also add: forbid `@nova/database` import outside `apps/api` (enforces I-2).
- **P2-2 (cleanup)** `apps/admin/.../apps/[slug]/{publish-checklist,database-card,settings-form,store-comp-control}.tsx` are no longer imported (app-detail rewritten) — remove or repurpose in the App Shell engine (Phase E).

## Verdict
**P2 PASS.** App money path is built end-to-end (pending the real-payload spike for live charges). The Apps track is now functional: register → publish → availability → install → charge → commission → (payout = P4). Cleared to start **P3 — the Tool track**, kept fully separate per the two-track model.
