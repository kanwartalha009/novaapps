# ADR-003: Pluggable payout providers

**Status:** Accepted · 2026-06-10

## Context
Agencies must be paid commissions. Kanwar wants manual ledger payouts at launch, plus Stripe Connect and PayPal Payouts later — without rework.

## Decision
Payouts module defines a `PayoutProvider` interface:

```ts
interface PayoutProvider {
  readonly key: 'MANUAL' | 'STRIPE_CONNECT' | 'PAYPAL';
  validateMethod(method: PayoutMethodDto): Promise<void>;
  release(batch: PayoutBatchDto): Promise<{ providerRef: string }>;
  getStatus(providerRef: string): Promise<PayoutStatus>;
}
```

Phase 1 ships `ManualPayoutProvider` (admin marks paid, records reference). Stripe Connect (Phase 4) and PayPal (Phase 5) are additional drivers registered in the provider registry. Commission calculation never knows which provider exists (invariant I-7).

## Consequences
- Adding a provider = new driver class + PayoutMethod fields + env vars. No changes to commissions/billing.
- Provider webhooks (Stripe payout.paid etc.) update `Payout.status` only.
