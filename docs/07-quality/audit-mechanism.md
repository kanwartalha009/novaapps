# Audit Mechanism

Audits are **repeatable checks that the system still matches its own rules.** Four kinds, each with an owner, a trigger, and a pass condition. Tests prove code works; audits prove the *system* is still coherent (invariants honored, specs match code, money reconciles, security holds). Modeled on the per-app `PHASE-0-AUDIT.md` pattern, lifted to the platform.

## A. Invariant audit (architecture)
**Checks:** every invariant in `CHANGE-CONTROL.md` (I-1…I-14) still holds.
**How (automatable where marked ⚙):**
- ⚙ I-1 monorepo layout matches `apps/*` + `packages/*` allowlist.
- ⚙ I-2 no Next.js surface imports `@nova/database` (only `apps/api` does).
- ⚙ I-3 only `packages/database` defines platform Prisma models; product schemas live in product repos, never in the platform schema.
- ⚙ I-4 module imports respect the dependency graph (ESLint boundary rule); no reverse edges.
- ⚙ I-5 money tables have no UPDATE/DELETE paths in services (only inserts + reversals).
- I-6 every revenue row traces to a verified webhook event (sampled).
- ⚙ I-8 no service mutates `Installation.agencyId` after create.
- ⚙ I-10 every controller route has a permission + audience guard.
- ⚙ I-12 tool-gated routes call the entitlements resolver; product backends carry the entitlement check.
- ⚙ I-13 no module except `store-bridge` references a Shopify Admin client or `Store.accessTokenEnc`.
- ⚙ I-14 no query joins App-revenue and Tool-revenue tables.
**Trigger:** every CI run (the ⚙ items) + manual review of the rest each release.
**Pass:** all ⚙ checks green; reviewer signs the non-automatable ones.

## B. Spec-vs-code drift audit
**Checks:** the specs are the source of truth and code hasn't silently diverged.
**How:**
- `apps/api` module folders map 1:1 to `03-modules/*.md` (name + dependency direction).
- Every endpoint in a module spec exists in its controller, and vice-versa (route inventory diff).
- `domain-model.md` entities match `schema.prisma` (field-level diff report).
- Surfaces' section/permission tables match the route guards.
**Trigger:** pre-merge to main + on any C2/C3 change.
**Pass:** drift report empty, or every diff has a linked spec update in the same change (the CHANGE-CONTROL rule: migrate consumers in the same change).

## C. Money reconciliation audit
**Checks:** the ledgers are internally consistent and match the providers.
**How (nightly job + report):**
- **App side:** Σ charges − Σ commissions − Σ Shopify fees == platform App margin; every Commission links to a Charge (except ADJUSTMENT); every PAID commission belongs to a PAID payout; reversals net correctly against originals.
- **Tool side:** local `Invoice`/`UsageRecord` mirror == Stripe (subscriptions + meter aggregation) within tolerance 0; every active `StoreBridgeConnection` billed exactly once per period (no double, no miss); trial periods never billed.
- **Cross:** agency net = commissions earned − tool spend matches what the agency surface shows.
**Trigger:** nightly; pre-release; on any billing/commission/metering change.
**Pass:** all equalities hold; any discrepancy opens an incident + `AuditLog` alert (it is never silently corrected — fix is a ledger entry, I-5).

## D. Security & access audit
**Checks:** least privilege and the Store Bridge blast radius.
**How:**
- Store Bridge: enumerate every tool's granted scopes vs `requiredScopes` (no excess); confirm revoke history actually severed access (no calls after revoke in `AuditLog`); rate/cost ceilings tripped as expected in load test.
- RBAC: role→permission matrix reviewed; no orphan permissions; no role exceeds its documented scope.
- Secrets: encryption-at-rest verified for tokens/credentials; tokens never appear in logs/responses (log scan).
- `AuditLog` completeness: every privileged action class (availability change, grant, publish, payout release, scope grant, setting change) produces a log row.
**Trigger:** pre-release + quarterly.
**Pass:** zero excess scopes, zero post-revoke access, zero secret leakage, audit-log coverage 100% of privileged classes.

## Per-phase audit (delivery gate)
Each phase in `06-plan/phased-plan.md` ends with a **post-phase audit**: run A (⚙) + B + the C/D slices relevant to that phase, plus the phase's own exit-gate evidence. Record the result in `audits/PHASE-Pn-AUDIT.md` (per-phase, like Encore's). A phase is **done** only when its audit is green. No phase reopens a prior phase's frozen contract without a CHANGE-CONTROL event.

## Cadence summary
| Audit | CI | Pre-merge | Nightly | Pre-release | Quarterly |
|---|---|---|---|---|---|
| A invariant (⚙) | ✓ | ✓ | | ✓ | |
| B drift | | ✓ | | ✓ | |
| C money | | | ✓ | ✓ | |
| D security | | | | ✓ | ✓ |
