# Module: subscriptions

**Owns:** inbound agency billing — `Subscription` + `Invoice`, backed by Stripe. The **single writer to Stripe** for subscription objects. (ADR-008, I-6 amended, I-14)
**Depends on:** tools-registry, agencies. **Consumed by:** entitlements, metering, admin/agency dashboards.

## Behavior
- Agency = Stripe **customer** (`Agency.stripeCustomerId`, created on first activation).
- **Activate (self-serve):** `POST /agency/tools/:id/subscribe` → Stripe Checkout/subscription on the tool's `ToolPlan.stripePriceId`. **7-day trial** (`trialDays`, default `Setting.defaultToolTrialDays`) → `TRIALING` → `ACTIVE`.
- **Lifecycle from verified Stripe webhooks** (`STRIPE_WEBHOOK_SECRET`): `customer.subscription.created|updated|deleted`, `invoice.paid|payment_failed` → update `Subscription.status` (`TRIALING/ACTIVE/PAST_DUE/CANCELED/INCOMPLETE`) and append `Invoice` rows. Idempotent on Stripe event id (`WebhookEvent.source=STRIPE`).
- **Invoices** mirrored append-only (I-5) for audit + the agency spend view; Stripe is source of truth.
- **Admin GRANT** is *not* a subscription — it's a `ToolActivation(source=GRANT)` with no Stripe object; entitlements treats it as access without billing.
- Upgrade/downgrade/cancel proxy to Stripe; proration per Stripe defaults.
- Tax via Stripe Tax (config); MoR is out of scope (ADR-008 consequences).

## Endpoints
```
POST /agency/tools/:id/subscribe             [tools:subscribe]   start trial→sub (Stripe Checkout)
POST /agency/subscriptions/:id/cancel        [tools:subscribe]
GET  /agency/subscriptions, /invoices        [agency]
POST /v1/webhooks/stripe                      (verified)         lifecycle + invoices
GET  /admin/subscriptions, /admin/invoices    [subscriptions:read]
```

## Invariants / notes
- Never hand-insert revenue (I-6): all `Subscription`/`Invoice` state derives from Stripe events.
- Separate tables from `billing`/`commissions`/`payouts` (I-14) — they meet only in reporting.
- Single Stripe writer: `tools-registry` plan edits call this module to create/update Stripe products/prices; `metering` owns meters.
