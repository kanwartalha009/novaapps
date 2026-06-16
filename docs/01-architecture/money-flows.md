# Money Flows

Two directions, both append-only ledgers (I-5), both webhook-sourced and never hand-inserted (I-6). Integer minor units + currency everywhere.

## Direction A — App revenue (merchant → platform → agency)

The agency is a **payee**: it earns commission on App revenue it referred.

```
Merchant subscribes/pays on a store
        │  Shopify Billing
        ▼
Shopify webhook  app_subscriptions/update | app_purchases  (HMAC-verified)
        │  forwarded by the App repo, Nova-signed (X-Nova-Signature)
        ▼
webhooks ──► billing.Charge            (externalId unique; idempotent)
        ▼
commissions.Commission                 (PENDING; rate/flat snapshotted; basis = gross|net of Shopify fee)
        │  admin approves (maturity window)
        ▼  APPROVED
payouts.Payout (DRAFT → PROCESSING → PAID)   via PayoutProvider (manual | stripe-connect | paypal)
        ▼
Agency receives money. Refund → Commission REVERSAL (negative), linked to original.
```

Source of truth: Shopify. Invariants: I-5 (ledger), I-6 (webhook-sourced), I-8 (referral immutable).

## Direction B — Tool revenue (agency → platform)

The agency is a **payer**: it pays Nova to use a Tool.

```
Agency activates a Tool
   ├─ admin GRANT  → entitlement (comped; no Stripe)            ┐
   └─ self-serve SUBSCRIBE → Stripe Checkout/Billing            │
            │  7-day trial → premium                            │
            ▼                                                    │
   subscriptions.Subscription  (trialing → active → past_due → canceled)
            │  Stripe webhooks: customer.subscription.*, invoice.paid/failed (verified)
            ▼                                                    │
   subscriptions.Invoice (mirror, ledgered)                     │
                                                                 ▼
   Tool usage happens ──► metering.UsageRecord ──► Stripe Meter events
            (metered features; per-store add-on = meter keyed on active bridge connections)
            │
            ▼
   entitlements resolves access + remaining quota ◄─────────────┘
   from {grant, subscription state, trial window, freemium limit}
```

Source of truth: Stripe (subscription + invoice + meter aggregation). Platform mirrors to a ledger for audit + the agency's *projected spend* view. Invariants: I-5, I-6 (extended to verified Stripe webhooks per ADR-008), and new I-12/I-13 (entitlements authority, metering→billing integrity).

## Plan shapes (Tools)

| Model | Trial | Recurring | Metered | Per-store |
|---|---|---|---|---|
| **FREE** | — | none | — | — |
| **FREEMIUM** | 7-day on paid features | zero-price base plan + paid add-ons | optional, with a free ceiling enforced by entitlements | optional |
| **PREMIUM** | 7-day | fixed recurring | optional | optional (meter on active bridge connections) |

Per-store charging only applies to tools that use the **Store Bridge**; the billable unit is an **active bridge connection** (a `(tool, store)` with a live offline token), reported to a Stripe meter.

## Why two ledgers, not one

`billing` (App) and `subscriptions`+`metering` (Tool) stay separate because the **counterparty, the processor, the direction, and the legal/tax treatment differ**. Conflating them would put outbound liabilities and inbound revenue in one table and break the clean commission-derivation chain. They meet only in reporting (platform P&L) and on the agency surface (net position = earnings − spend).

## Platform P&L (reporting view, not a ledger)

```
Platform revenue   = App platform-share (charges − agency commissions − Shopify fees)
                   + Tool revenue (subscriptions + metered + per-store)
Platform liability = Commissions payable to agencies (until PAID)
Agency net (shown on agency surface) = commissions earned − tool spend
```
