# P6 — Execution Runbook (inbound Stripe billing)

The final phase: the **agency-pays** money path (Direction B in `money-flows.md`). `subscriptions` + `metering` (Stripe), the **full** `entitlements` resolver, self-serve subscribe + projected spend. Kept fully separate from App revenue (I-14). Amends I-6 (Stripe is a verified webhook revenue source, ADR-008).

> Stripe via **REST** (no SDK dep — typechecks clean). Live calls (customers/subscriptions/meters/checkout) + webhooks need `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` on the Mac (test mode).

## Commit 1 — subscriptions (Stripe inbound)  `[✓ authored]`
- `common/stripe.ts` — `stripeFetch` (REST, form-encoded, Bearer) + `verifyStripeSignature` (t/v1 HMAC).
- `subscriptions.service` — customer-per-agency (`Agency.stripeCustomerId`); **self-serve subscribe** (`POST /agency/tools/:id/subscribe`) creates a Stripe subscription with a **7-day trial** on the plan's price (auto-creates the Stripe product/price if missing); creates a `Subscription` row (TRIALING) + a `ToolActivation(source=SUBSCRIPTION)`. Lifecycle via verified `POST /v1/webhooks/stripe` (`customer.subscription.*`, `invoice.paid|payment_failed`) → status + append `Invoice` mirror (I-5). Cancel + reads. **Single Stripe writer** for subs/prices.
**Acceptance:** subscribe → TRIALING; a `customer.subscription.updated`→active flips the row; `invoice.payment_failed`→past_due; nothing hand-inserted (I-6).

## Commit 2 — metering + projected spend  `[✓ authored]`
- `metering.service` — `reportUsage` (idempotent `UsageRecord` + Stripe **meter event**); **per-store meter** = count of ACTIVE `StoreBridgeConnection` for (agency, tool); `projectedSpend(agency)` (base + metered-so-far + per-store); nightly `reconcile` (local vs Stripe).
**Acceptance:** reporting usage is idempotent (no double-bill); per-store count matches active bridge connections; projected spend renders before the invoice.

## Commit 3 — entitlements full resolver  `[✓ authored]`
`entitlements.resolve` now: `GRANT` → `SUBSCRIPTION(active|trialing)` → `FREEMIUM`(plan exists + under ceiling) → `NONE`; materializes `reason`, `expiresAt` (trial/period end), and per-meter `quota` (allowance − usage). Past_due/canceled → access false.
**Acceptance:** entitlement flips correctly across trial→active→past_due→canceled; freemium grants baseline access; quota reflects metered usage.

## Commit 4 — post-P6 audit + agency billing UI  `[✓ authored]`
- `PHASE-P6-AUDIT.md` — money reconciliation §C (tool side): Invoice/UsageRecord mirror == Stripe, per-store billed once, trials never billed, no double-billing (idempotency), I-14 separation.
- Agency `/subscriptions` (or extend `/tools`): projected spend + self-serve **Subscribe / Start trial**.

## Run on your Mac
```bash
pnpm build && pnpm typecheck
# Stripe test mode: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET; `stripe listen --forward-to localhost:4000/v1/webhooks/stripe`
#   subscribe to Outreach Composer → 7-day trial → simulate invoice.paid → entitlement = SUBSCRIPTION.
```

## Status
- [x] Commit 1 subscriptions (authored)
- [x] Commit 2 metering + projected spend (authored)
- [x] Commit 3 entitlements full resolver (authored)
- [x] Commit 4 post-P6 audit + agency billing UI (authored)
