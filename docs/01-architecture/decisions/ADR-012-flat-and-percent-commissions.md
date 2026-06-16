# ADR-012: Flat and percentage commissions

**Status:** Accepted · 2026-06-14 · Class: C2 (touches commissions + domain model) · Minor.

## Context
Kanwar wants App commissions configurable as **flat and percentage**. Today only percentage exists: `Agency.commissionRateBps`, `AgencyApp.rateBps`, and `Commission.rateBps` are bps-only. A flat per-charge (or per-install) commission can't be expressed.

## Decision
Add a **`commissionModel`** discriminator alongside the existing rate fields, snapshotted on each `Commission` exactly as `rateBps` already is (I-5 audit). **Named `commissionModel`, not `commissionType`** — the schema already has a `CommissionType` enum meaning the *ledger entry kind* (`EARNED`/`REVERSAL`/`ADJUSTMENT`); the new enum is `CommissionModel { PERCENT, FLAT }`.

- Config (resolution order unchanged: assignment → agency → platform default):
  `AgencyApp.commissionModel (PERCENT|FLAT)` + `AgencyApp.flatAmount?` ; same optional pair on `Agency`; platform defaults in `Setting` (`defaultCommissionModel`, `defaultFlatAmount`).
- `Commission` gains `commissionModel` + `flatAmount?`; `amount` is computed as `PERCENT → basisAmount × rateBps / 10000` or `FLAT → flatAmount` and then **snapshotted**.
- `commissionBasis` (gross vs net of Shopify fee, F10) is pinned in `Setting.commissionBasis` (default **NET**, per ADR-004 + the seed) and applied before a PERCENT calc.

## Consequences
- C2 migration on `Commission`, `AgencyApp`, `Agency`, `Setting`; consumers = `commissions` service, admin/agency dashboards, CSV statements.
- Calculation logic branches on `commissionModel`; reversal logic unchanged (still negative mirror of the snapshot).
- Tools are unaffected (they don't generate commissions).
