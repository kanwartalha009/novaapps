# Module: billing

**Owns:** the **App** revenue ledger — Shopify Billing charge events (the basis for commissions).
**Depends on:** installations. **Consumed by:** commissions, admin/agency reporting.

> **Naming (v2, F4):** "billing" = **App revenue from Shopify** (this module). Inbound **Tool** revenue from agencies (Stripe) lives in `subscriptions` + `metering`, kept in separate tables (I-14). Don't conflate the two.

## Behavior
- Charges created ONLY by the webhooks module handing over verified Shopify billing events (I-6): subscription cycles, one-time purchases, usage charges, refunds (negative amount, type REFUND).
- Idempotent on `externalId`. Amounts in minor units; currency from Shopify payload.
- Optionally records `shopifyFeeBps` snapshot to support net-basis commissions (ADR-004).
- Emits domain event `charge.recorded` → commissions module listens (in-process event, NestJS EventEmitter; queue later if needed — C2).
- **Per-store comps/discounts** (`Installation.planOverride`, C2): the override is applied by the **app** when it creates the Shopify subscription, so the ledger only ever sees the real (discounted or zero) charge — no special-casing here. A fully comped store generates no charge (hence no commission); a discounted store's commission derives from the reduced amount.

## Endpoints (read-only)
```
GET /admin/charges                 [billing:read]   (filter: app, agency, store, range)
GET /agencies/me/charges           (agency aud — only own attributed charges)
```
