# Change Control

This document is the contract for how changes are requested and applied. Its purpose: **a change to one module must never silently alter the architecture or other modules.**

## Invariants (architecture-level, frozen)

Changing any of these is an **architecture change**, never a module change:

1. **I-1 Monorepo layout** — `apps/{api,web,admin,agency}` + `packages/{database,shared,tsconfig}`. Turborepo + pnpm.
2. **I-2 Single API** — all business logic lives in `apps/api` (NestJS). Next.js apps never talk to the database directly; they call the API.
3. **I-3 Single *platform* schema package** — all **platform** Prisma models live in `packages/database`; no surface defines platform tables outside it. **Products (Apps/Tools) are standalone repos that own their own schema + migrations** (ADR-002 reconciled, ADR-010); the platform stores product **metadata + credentials only**. The boundary "platform schema vs product schema" is the invariant, not "one schema for everything." *(Reworded 2026-06-14, F1 — the prior text contradicted the standalone-repo model.)*
4. **I-4 Module boundaries** — backend modules (see `03-modules/`) communicate through service interfaces, never by reaching into another module's repository/tables.
5. **I-5 Money is a ledger** — `Charge`, `Commission`, `Payout` rows are append-only. Corrections are new reversal entries, never updates/deletes.
6. **I-6 Billing source of truth** — revenue enters the system **only via verified provider webhooks**: **Shopify Billing** for App revenue, **Stripe** for Tool revenue (ADR-008). Both are HMAC/signature-verified and idempotent. Commissions and tool charges are **derived from those events, never manually inserted** (manual corrections use a typed `ADJUSTMENT`/reversal ledger entry). *(Amended 2026-06-14 — added the Stripe inbound source; the principle is unchanged.)*
7. **I-7 Payout providers are pluggable** — payouts go through the `PayoutProvider` interface (`manual`, `stripe-connect`, `paypal`). Adding a provider never touches commission logic.
8. **I-8 Attribution** — agency referral is captured at install time (`Installation.agencyId`) and is immutable for the life of the installation.
9. **I-9 Multi-tenancy** — agency-scoped data is always filtered by `agencyId` at the API layer; the agency app resolves its tenant from the subdomain.
10. **I-10 AuthN/AuthZ** — JWT (access+refresh) issued by the API; RBAC permissions enforced by guards in the API only. UI hiding is cosmetic, not security.

### Added 2026-06-14 (product classes + tools)

11. **I-11 Two product classes** — every unit of inventory is an **App** or a **Tool** (ADR-007). Product class is fixed at creation and determines money direction, data plane, builder shell, and activation. A change of class is a re-create, never an update.
12. **I-12 Entitlements are the access authority** — whether an agency may use a Tool, and how much quota remains, is decided **only** by the `entitlements` resolver from {admin grant, subscription state, trial window, freemium limit} (ADR-011). UI gating is cosmetic; product backends must check entitlement server-side.
13. **I-13 Store Bridge is the only Tool→store path** — Tools never hold raw Shopify tokens or call the Admin API directly. All store access goes through the **scoped, audited, rate-limited Store Bridge proxy** (ADR-009); offline tokens are owned/rotated by the Bridge.
14. **I-14 Inbound and outbound money never mix** — App-revenue ledgers (`billing`/`commissions`/`payouts`, outbound to agencies) and Tool-revenue ledgers (`subscriptions`/`metering`/`invoices`, inbound from agencies) are **separate tables**. They meet only in reporting views, never in a shared row (I-5 still holds for each).

## Change classification

When a change is requested, classify it before writing code:

| Class | Definition | Process |
|---|---|---|
| **C1 — Module-internal** | Touches one module's spec + code; no API contract or schema change consumed by others | Update the module spec, implement, done |
| **C2 — Contract** | Changes an API endpoint shape, shared type, or Prisma model used by >1 module/app | Update module spec + `domain-model.md`, list consumers, migrate all consumers in the same change |
| **C3 — Architecture** | Violates or amends an invariant above | **STOP. Do not implement.** Produce an impact report: which invariant, which modules affected, migration steps, rollback plan. Get explicit approval, then record an ADR in `01-architecture/decisions/`. |

## Working agreement with the assistant

When Kanwar requests a change, the assistant must:

1. State the classification (C1/C2/C3) and which module spec(s) it maps to.
2. For C2: list every consumer that must change.
3. For C3: refuse to implement immediately; propose resolution steps and wait for approval.
4. Never invent endpoints, models, or fields not present in these specs — if something is missing, flag it as a spec gap first.
5. State which **product class** (App / Tool) and which **shell** the change touches; a change to one class must not silently alter the other (I-11, I-14).

> The 2026-06-14 architecture overhaul (Tools, inbound billing, Store Bridge, shells) is itself a **C3** event; its impact report is `audits/2026-06-14-architecture-overhaul.md` and its decisions are `01-architecture/decisions/ADR-007..012`.
