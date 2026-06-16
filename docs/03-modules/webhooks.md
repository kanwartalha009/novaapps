# Module: webhooks

**Owns:** webhook ingress, verification, idempotent dispatch — for **all sources**.
**Depends on:** installations, billing, store-bridge (handlers). **Consumed by:** (ingress only).

> **v2 (2026-06-14, C2 — F6).** Ingress now serves three sources, discriminated on `WebhookEvent.source`: `SHOPIFY_APP` (`/v1/webhooks/shopify/:appSlug`), `STRIPE` (`/v1/webhooks/stripe` — tool subscription/invoice lifecycle, verified with `STRIPE_WEBHOOK_SECRET`), `STORE_BRIDGE` (`/v1/webhooks/store-bridge/:toolSlug` — relayed store events). `appSlug` generalized to `productType` + `productSlug`. Idempotency unchanged; route by `(source, topic)`. See `subscriptions.md`, `store-bridge.md`.

> **v1 amendment (2026-06-12, C2 — implemented R1).** Forwarded webhooks are **Nova-signed**, not
> Shopify-HMAC passthrough: verify `X-Nova-Signature: sha256=<hex HMAC-SHA256(rawBody, NOVA_INGRESS_HMAC_SECRET)>`
> (supersedes "that app's webhook secret" below). Topic/shop/id arrive in `X-Nova-Topic` /
> `X-Nova-Shop-Domain` / `X-Shopify-Webhook-Id`. Contract: `shopify/encore/NOVA-INTEGRATION-CONTRACT.md`.
> Implemented in `apps/api/src/modules/webhooks`.

## Behavior
- `POST /webhooks/shopify/:appSlug` — raw body kept for HMAC verification (see v1 amendment above). Reject 401 on mismatch.
- Store every event as `WebhookEvent` (unique externalId = `X-Shopify-Webhook-Id`) → 200 immediately → process async.
- Topic routing:
  - `app/uninstalled` → installations.markUninstalled
  - `app_subscriptions/update` → billing.recordSubscriptionCharge / installations.updatePlan
  - `app_purchases_one_time/update` → billing.recordOneTimeCharge
  - `shop/redact`, `customers/redact`, `customers/data_request` → GDPR handlers (Phase 2, mandatory for App Store)
- Failed handlers → `FAILED` + error; admin retry endpoint. Nightly reconciliation job (Phase 3) backfills missed events from Shopify Admin API.

## Endpoints
```
POST /webhooks/shopify/:appSlug         (public, HMAC)
GET  /admin/webhook-events              [billing:read]
POST /admin/webhook-events/:id/retry    [settings:write]
```
