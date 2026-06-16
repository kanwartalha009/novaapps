# Platform Capability Manifest (v1)

The versioned, machine-readable description of **what Nova supports.** The validator skills check ideas against it ("does this work on Nova?"); the engines generate from it; this doc describes it in prose. When code and this file disagree, that's a spec-vs-code drift audit failure (`07-quality/audit-mechanism.md §B`).

> Keep this in sync with `01-architecture/`, `03-modules/`, and `05-product/`. Bump the version on any change.

## Product classes
`APP` · `TOOL` (fixed at creation, I-11).

## App capabilities
- **Monetization:** Shopify Billing only (subscription `EVERY_30_DAYS`|`ANNUAL`, one-time, usage). Pricing models: `FREE` | `FREEMIUM` | `PREMIUM`.
- **Commission to agency:** `PERCENT` (bps) or `FLAT`; basis `GROSS`|`NET` of Shopify fee.
- **Data plane:** Shopify OAuth at install (token-exchange, embedded) + webhooks.
- **Module taxonomy (generator targets):** `backend` (App Home, React Router) · `admin-ui` (actions/blocks/links) · `storefront-widget` (theme app extension: app block/embed) · `checkout` (Plus-flagged) · `function-discount` | `function-cart-transform` (max 1/app) | `function-validation` | `function-delivery` | `function-payment` · `pixel` · `customer-account` · `flow` · `pos`.
- **Mandatory:** GDPR webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) + `app/uninstalled` + `app_subscriptions/update`, forwarded Nova-signed to ingress.
- **Constraints:** theme integration only via theme app extensions; one cart-transform/app; distribution choice irreversible.

## Tool capabilities
- **Type:** `AGENCY` | `STORE` | `HYBRID`.
- **Monetization (Stripe, agency pays):** `FREE` | `FREEMIUM` | `PREMIUM`; `trialDays` default **7**; metered components (each → a Stripe Meter); optional **per-store** add-on (meter = active Store Bridge connections).
- **Data plane:** Store Bridge (only for `STORE`/`HYBRID`) — scoped GraphQL Admin proxy over per-store OAuth offline tokens; webhook relay. Pure `AGENCY` tools have no store access.
- **Access:** unified `Availability` (PRIVATE allowlist | PUBLIC denylist) + `Entitlement` (GRANT | SUBSCRIPTION | TRIAL | FREEMIUM | quota). Activation: admin GRANT or self-serve SUBSCRIBE.
- **Module taxonomy (generator targets):** `agency-ui` · `store-actions` (Bridge-mediated) · `jobs` · `webhooks` (relayed) · `api` · `entitlement-gates`.
- **Store Bridge scopes:** declare least-privilege `requiredScopes` (Shopify Admin API scopes); admin approves at release. GraphQL Admin only (REST is legacy).

## Shared platform facts
- Standalone repo + own Postgres DB per product (I-3 reconciled). Platform stores metadata + credentials only.
- Integration contract: `X-Nova-Signature` (HMAC-SHA256 raw body); install-confirm (apps), webhook/store-event ingress, entitlement check (tools).
- Money: integer minor units + currency; append-only ledgers (I-5); webhook-sourced (I-6); App and Tool ledgers never mix (I-14).
- Auth: JWT (15m/30d), audiences `admin|agency|app-shell|tool-shell`; RBAC server-side (I-10).

## What Nova does NOT support (say so in validation)
- Non-Shopify storefronts/Hydrogen, full themes/Theme Store, Payments apps (separate tracks).
- Tools holding raw Shopify tokens or calling Shopify directly (I-13 — must go through the Bridge).
- Manually inserted revenue/commissions (I-6).
- Changing a product's class after creation (re-create instead).

## Version
`manifest_version: 1` · aligned to docs as of 2026-06-14. Consumers must check the version and fail loudly on mismatch.
