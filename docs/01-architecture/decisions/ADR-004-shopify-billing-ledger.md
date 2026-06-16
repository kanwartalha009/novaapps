# ADR-004: Shopify Billing API as sole revenue source; ledger money model

**Status:** Accepted · 2026-06-10

## Context
Apps listed on the Shopify App Store must use the Shopify Billing API for merchant charges. Commissions must be auditable.

## Decision
1. Revenue enters only via verified Shopify webhooks (`app_subscriptions/update`, `app_purchases_one_time/update`, future `app_subscription_billing_attempt`) → `Charge` rows (invariant I-6).
2. `Charge`, `Commission`, `Payout` are append-only ledgers; corrections are reversal/adjustment entries (invariant I-5).
3. Amounts stored as integer minor units + ISO currency.

## Consequences
- Full audit trail; commission totals are always recomputable from charges.
- Shopify takes its revenue share upstream; commission basis is configurable (gross vs net of Shopify fee) — platform setting, default **net**.
- Webhook gaps covered by a nightly reconciliation job against the Shopify Admin API (Phase 3).
