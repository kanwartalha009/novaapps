# Module: commissions

**Owns:** Commission ledger + calculation rules (Apps only; tools generate no commissions).
**Depends on:** billing, agencies. **Consumed by:** payouts, dashboards.

> **v2 (2026-06-14, C2 — ADR-012, F10).** Commissions support **PERCENT and FLAT** via `commissionModel` (named to avoid the existing `CommissionType` enum = ledger kind). `commissionBasis` (gross vs net of Shopify fee) is pinned in `Setting.commissionBasis`, default **NET** (ADR-004 + seed).

## Calculation
On `charge.recorded`, resolve model + rate (order: assignment → agency → platform default):
```
basis  = charge.amount minus Shopify fee (NET)  — or full amount (GROSS), per Setting.commissionBasis (default NET)
model  = agencyApp.commissionModel ?? agency.commissionModel ?? Setting.defaultCommissionModel   (PERCENT | FLAT)
PERCENT: rate = agencyApp.rateBps ?? agency.commissionRateBps ?? Setting.defaultCommissionRateBps
         amount = round_half_even(basis * rate / 10000)
FLAT:    amount = agencyApp.flatAmount ?? agency.flatAmount ?? Setting.defaultFlatAmount
```
- Snapshot `commissionModel`, `rateBps`/`flatAmount`, and `basis` on the row (audit, I-5).
- REFUND charges produce `REVERSAL` commissions (negative), linked via `reversesCommissionId`.
- Manual corrections: `ADJUSTMENT` entries created by admin [commissions:approve], reason required. Never edit existing rows.

## Lifecycle
`PENDING` → (admin approve, or auto-approve after `Setting.commissionMaturityDays` — protects against refund windows) → `APPROVED` → attached to a Payout → `PAID`.

## Endpoints
```
GET  /admin/commissions                         [commissions:read]
POST /admin/commissions/:id/approve             [commissions:approve]
POST /admin/commissions/adjust                  [commissions:approve]
GET  /agencies/me/commissions                   (agency aud)
GET  /agencies/me/commissions/summary           (balance: pending/approved/paid)
```
