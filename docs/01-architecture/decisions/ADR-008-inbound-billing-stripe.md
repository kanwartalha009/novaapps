# ADR-008: Inbound agency billing via Stripe

**Status:** Accepted · 2026-06-14 · Class: C3 (amends I-6; adds I-14) · Depends on ADR-007.

## Context
Tools are paid for **by agencies**: freemium + premium, a **7-day trial**, **metered** usage, and an optional **per-store** charge when the Store Bridge is used. The platform has no inbound payment path today — the money model is outbound only (Shopify → commission → payout). We need an inbound processor and a ledger that mirrors the existing append-only discipline. Provider choice (decided with Kanwar): **Stripe Billing**.

Research (2026-06): Stripe removed the legacy usage-records API in version `2025-03-31.basil`; **every metered price must be backed by a `Meter` object**, and usage is reported as **meter events** that Stripe aggregates per period. Stripe supports trials, zero-price (freemium) base plans, and graduated/PAYG metered pricing.

## Decision
Add two modules, kept fully separate from `billing`/`commissions`/`payouts` (I-14):

- **`subscriptions`** — owns `Subscription` + `Invoice`, backed by Stripe subscriptions. Agency = Stripe **customer** (`Agency.stripeCustomerId`). Handles trial (7d default, `Setting.defaultToolTrialDays`), upgrade/downgrade, cancel, and `past_due` via verified Stripe webhooks (`customer.subscription.*`, `invoice.paid|payment_failed`).
- **`metering`** — owns `Meter` + `UsageRecord`. Each `ToolPlan.meteredComponents[]` and the `perStore` add-on map to a Stripe `Meter`; the platform reports **meter events** (idempotent via `stripeMeterEventId`) and mirrors usage for the agency's **projected-spend** view.

Per-store billing: the billable unit is an **active `StoreBridgeConnection`**; `metering` reports the count to an `active_stores` meter (ADR-009).

Money stays a ledger (I-5): `Invoice`/`UsageRecord` are append-only mirrors; Stripe is the source of truth; nothing is hand-inserted (I-6). A `BillingProvider` seam is kept thin so a future processor swap is possible, but Stripe is the only driver.

## Consequences
- I-6 amended: revenue may now also enter via **verified Stripe webhooks** — same principle (webhook-sourced, idempotent, ledgered), new source.
- New env/secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price/meter ids stored on `ToolPlan`/`Meter`.
- `entitlements` (ADR-011) reads subscription + usage state to gate access/quota.
- Tax/VAT: use Stripe Tax; if MoR coverage is later required, that is a new ADR (Paddle/LS were the rejected alternative for now — more control chosen over MoR convenience).
- The agency surface must show projected spend **before** the invoice to control churn.
