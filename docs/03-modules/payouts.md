# Module: payouts

**Owns:** Payout batches, payout methods, provider drivers (ADR-003).
**Depends on:** commissions, agencies. **Consumed by:** admin + agency dashboards.

## Behavior
- Agency configures a PayoutMethod (one per provider; one marked default).
- Batch creation [payouts:create]: select agency → system gathers APPROVED, unassigned commissions ≥ `Setting.minPayoutAmount` → Payout(DRAFT) with line items.
- Release [payouts:release]: routed to the provider driver:
  - **MANUAL** (Phase 1): admin records external transfer reference → PAID.
  - **STRIPE_CONNECT** (Phase 4): transfer via Stripe API; status via Stripe webhooks.
  - **PAYPAL** (Phase 5): Payouts API; status via webhook/poll.
- FAILED payouts detach their commissions back to APPROVED (new ledger state transition, rows untouched).
- Agency side: view payout history, statements (CSV/PDF export Phase 3).

## Endpoints
```
GET/POST        /agencies/me/payout-methods      (OWNER)
GET             /agencies/me/payouts             (agency aud)
GET/POST        /admin/payouts                   [payouts:*]
POST            /admin/payouts/:id/release       [payouts:release]
POST            /webhooks/stripe | /webhooks/paypal   (provider status ingress, Phase 4/5)
```
