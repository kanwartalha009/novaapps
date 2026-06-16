# Module: installations

**Owns:** App↔Store installs, referral attribution, install-flow handoff to Shopify.
**Depends on:** apps, stores, agencies. **Consumed by:** billing, webhooks.

> **v1 amendment (2026-06-12, C2 — implemented R1).** `POST /v1/internal/installations/confirm` verifies
> `X-Nova-Signature: sha256=<hex HMAC-SHA256(rawBody, NOVA_INSTALL_CONFIRM_SECRET)>`; body
> `{ shopDomain, appSlug, planName?, installedAt }` → flips the Installation to ACTIVE (agencyId immutable, I-8).
> Contract: `shopify/encore/NOVA-INTEGRATION-CONTRACT.md`. Implemented in `apps/api/src/modules/installations`.

## Behavior
- Agency clicks "Install on store" → Installation(`PENDING`, agencyId = current agency, **immutable**, I-8) → redirect to the app's Shopify install URL.
- The Shopify app (external codebase) confirms install via `app/installed`-style webhook or a signed callback to this API → status `ACTIVE`, plan recorded.
- Uninstall webhook → `UNINSTALLED` (history kept; commissions on past charges unaffected).
- Plan changes arrive via billing webhooks and update `currentAppPlanId`.
- A per-store **plan override** (`planOverride`: `FREE` | `PERCENT` | `FIXED`) can comp or discount a specific store even when the app is on a paid plan. Set by the operator/agency; the app reads it at subscription-creation time and prices accordingly. It never changes the immutable `agencyId`.
- One ACTIVE installation per (appId, storeId).

## Endpoints
```
GET  /agencies/me/installations              (agency aud)
POST /agencies/me/installations              { appId, storeId } → { redirectUrl }
GET  /admin/installations                    [stores:read]
POST /internal/installations/confirm         (HMAC-signed, called by app backends)
```
