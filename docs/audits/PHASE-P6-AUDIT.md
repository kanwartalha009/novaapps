# Post-P6 Audit (2026-06-15)

Gate audit for **Phase P6 — inbound Stripe billing** (subscriptions + metering + full entitlements). Per `07-quality/audit-mechanism.md §C`. **Verdict: PASS** for the authorable scope; live Stripe flows (customers/subscriptions/meters/webhooks) run on the Mac in test mode with `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`.

## What P6 shipped
- **subscriptions** — `common/stripe.ts` (REST + webhook sig verify); customer-per-agency; self-serve **subscribe** (7-day trial, auto-creates Stripe product/price); lifecycle via verified `/v1/webhooks/stripe`; `Invoice` mirror; cancel; reads.
- **metering** — usage → Stripe meter events (idempotent `UsageRecord`); per-store meter (active bridge connections); projected spend; reconcile.
- **entitlements (full)** — `GRANT → SUBSCRIPTION(active|trialing) → FREEMIUM → NONE` + expiry + per-meter usage; re-resolved on every subscription change.

## A — Invariant audit
| Inv | Result | Evidence |
|---|---|---|
| I-6 (amended) revenue is webhook-sourced | ✅ | `Subscription`/`Invoice` state derives only from verified Stripe webhooks (`verifyStripeSignature`); subscribe creates the Stripe object first, mirror follows. Nothing hand-inserted. |
| I-5 append-only | ✅ | `UsageRecord`/`Invoice` are inserts; subscription status transitions only. |
| I-12 entitlements authority | ✅ | full resolver is the single access decision; re-resolved on subscribe/cancel/webhook; UI reads it. |
| I-14 ledgers never mix | ✅ | Tool revenue (`Subscription`/`Invoice`/`UsageRecord`) is wholly separate from App revenue (`Charge`/`Commission`/`Payout`); no shared rows/joins; `adminOverview` stays App-only. |
| I-10 RBAC | ✅ | admin reads `subscriptions:read`/`metering:read`; agency routes tenant-scoped; tool usage + Stripe webhook are signature-verified. |

## C — Money reconciliation (tool side)
| Check | Result | Evidence |
|---|---|---|
| No double-billing on usage | ✅ | `UsageRecord.stripeMeterEventId` unique; `reportUsage` returns the existing record on replay (idempotent). |
| Trials never billed | ✅ | TRIALING subscriptions grant access (reason TRIAL) but Stripe defers charge until trial end; `invoice.paid` only fires post-trial. |
| Per-store billed once | ✅ | per-store meter = count of **ACTIVE** `StoreBridgeConnection` (deduped by `@@unique(toolId,storeId)`); reported on a schedule. |
| Local mirror vs Stripe | ◻︎ live | `reconcile` compares local `UsageRecord`/`Invoice` to Stripe aggregation — runs against Stripe in test mode (Mac). |

## Exit gate (`06-plan/phased-plan.md` P6)
- ✅ Self-serve subscribe → 7-day trial → metered → per-store billed → projected spend before invoice; entitlement flips across trial→active→past_due→canceled (re-resolved on each webhook). **Code path complete.**
- ◻︎ **Live**: real Stripe test-mode round-trip (subscribe + `stripe listen` webhooks) on the Mac.

## Flags
- **P6-1** Stripe live calls/webhooks need `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (test mode, Mac).
- **P6-2** projected-spend overage math is simplified (base + metered units this period); graduated/tiered pricing is a refinement.
- **P6-3** freemium hard-ceiling enforcement at usage-report time (reject over-ceiling for free tier) is a refinement; P6 resolver grants freemium baseline access + reports usage.
- **Carry:** P5-1/2 (bridge OAuth + rate Redis), P2-1 (Shopify payload spike), P1-1 (ESLint boundary), P4 (tool-admin editing + auth).

## Verdict
**P6 PASS.** The Tool money path is complete: agencies subscribe (trial → premium), are metered + per-store billed via Stripe, see projected spend, and entitlements reflect billing state — fully separate from App revenue (I-14). **This completes the v2 architecture overhaul**: two product classes, two money directions, three shells, Store Bridge, entitlements, and the creation skills — all built across P1–P6 (with the flagged Mac/external pieces: live Shopify/Stripe, the running reference tool, in-shell editing).
