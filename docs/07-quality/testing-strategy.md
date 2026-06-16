# Testing Strategy

The platform's own test policy (distinct from a product's tests — those live in each product repo and are gated by its delivery plan). Goal: **money is never wrong, access is never wrong, and contracts never drift silently.**

## Test layers

| Layer | Scope | Tooling | Runs |
|---|---|---|---|
| **Unit** | pure logic: commission math, entitlement resolution, availability resolution, signature verify | Vitest/Jest | every commit |
| **Integration** | a module against a real Postgres + mocked providers (Shopify/Stripe) | Jest + Testcontainers | every commit |
| **Contract** | the platform↔product integration contract (install-confirm, ingress, entitlement check, Store Bridge proxy) | contract tests + recorded fixtures | every commit |
| **E2E** | a flow across surfaces+API+DB (install→charge→commission; subscribe→meter→invoice; grant→access) | Playwright + seeded data | pre-merge to main, nightly |
| **Security** | Store Bridge scope/token/revoke/rate-limit; authz on every route | targeted suites + ZAP baseline | nightly + pre-release |

## What MUST have tests (non-negotiable, tied to invariants)

- **Money math (I-5, I-6, I-14):**
  - Commission PERCENT and FLAT, gross vs net basis, rounding (round-half-even), reversal = exact negative of snapshot, ADJUSTMENT requires reason. *Property test:* sum(commissions for a charge) is consistent; ledger never mutated.
  - Subscriptions: trial→active→past_due→canceled transitions only from verified Stripe events; **idempotent** on Stripe event id (no double-apply).
  - Metering: usage idempotent on `stripeMeterEventId`; local mirror reconciles to Stripe (0 drift); **no double-billing** under retries.
  - **I-14 separation:** a test asserts no row/table joins App-revenue and Tool-revenue ledgers.
- **Entitlements (I-12):** truth table — {GRANT, SUBSCRIPTION active|trialing, FREEMIUM under/over ceiling, NONE, quota exhausted} → expected access. Server-side enforcement test: a request without entitlement is rejected even if the UI would allow it.
- **Availability (ADR-011):** PRIVATE allowlist and PUBLIC denylist both resolve correctly; `AgencyApp`→Availability migration is loss-free; redaction blocked when active installs exist.
- **Store Bridge (I-13, ADR-009):** tool with insufficient scopes is denied; a tool can never obtain a raw token; **revoke kills access immediately and completely**; per-store rate/cost ceiling enforced; relayed webhooks are idempotent and signature-verified.
- **Webhook ingress (I-6):** HMAC/signature reject on tamper (401); idempotent on external id; `(source, topic)` routing correct for SHOPIFY_APP / STRIPE / STORE_BRIDGE.
- **AuthN/AuthZ (I-10):** every API route asserts required permission + audience; negative tests for each.
- **Attribution (I-8):** `Installation.agencyId` immutable after set.

## Test data
Seed factories mirror `domain-model.md` (and the `FX_*` fixtures already in `@nova/shared`). Stripe/Shopify use recorded fixtures + the providers' test modes in E2E. Never hit live provider APIs in CI.

## CI gates (platform)
```
lint + typecheck  →  unit + integration + contract  →  build all surfaces  →  invariant audit (audit-mechanism.md §A)
pre-merge main:   + E2E happy paths
pre-release:      + security suite + full E2E + money reconciliation audit
```
A red invariant audit **blocks merge** the same as a failing test.

## Per-phase requirement
Each phase in `06-plan/phased-plan.md` names its exit gate; the matching tests above must exist and pass **before** the phase's post-phase audit is run. No phase is "done" on code alone.

## Out of scope (product-side)
Each App/Tool repo owns its own unit/integration/e2e tests and its phase audits (Encore's `PHASE-0-AUDIT.md` pattern). The platform only tests the **contract** it exposes to products.
