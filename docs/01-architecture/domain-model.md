# Domain Model

Canonical source: `packages/database/prisma/schema.prisma` (platform schema only — product repos own their own schemas, reconciled I-3). This doc explains intent; the schema is authoritative for fields.

> **v2 (2026-06-14):** adds the **Tool** product class, **inbound (Stripe) billing**, the **Store Bridge**, unified **Availability**, and **Entitlements**. New entities are marked **(v2)**. Migration lands with implementation per phase (see `06-plan/phased-plan.md`); nothing below is built yet beyond what schema.prisma already contains.

## Entities

### Identity & access
- **User** — platform login (operators + agency members share the table; roles decide surface access).
- **Role / Permission / RolePermission / UserRole** — RBAC. Permissions are static strings (`apps:write`, `tools:write` **(v2)**, `payouts:release`, …) seeded in code; roles configurable. Audiences now include `app-shell` and `tool-shell` **(v2)**.

### Tenancy
- **Agency** — tenant. `slug` (subdomain), commission settings, payout settings, and **Stripe customer id** **(v2)** (payer identity for tool billing).
- **AgencyMember** — User↔Agency with an agency-level role (`OWNER`, `MEMBER`). v2 adds spend-capable distinction via permissions (who may subscribe/spend).

### Catalog — Apps
- **App** — registry entry for a Shopify app: name, slug, description, icon, listing URL, status (`DRAFT`/`PUBLISHED`/`DELISTED`), `pricingModel` (`FREE`/`FREEMIUM`/`PREMIUM`), encrypted Shopify credentials. Engine fields (C2): `repoUrl`, `shopifyClientId`, `moduleManifest`, `latestVersion`, `publishChecklist`, `spec`.
- **AppPlan** — pricing plan: name, amount (minor units), currency, interval, trialDays, shopifyHandle.

### Catalog — Tools **(v2)**
- **Tool** — registry entry for a Nova tool: name, slug, description, icon, status (`DRAFT`/`PUBLISHED`/`DELISTED`), **`toolType`** (`AGENCY` | `STORE` | `HYBRID`), `usesStoreBridge` (bool), `requiredScopes` (string[] — Shopify Admin scopes the bridge must hold), engine fields (`repoUrl`, `moduleManifest`, `latestVersion`, `publishChecklist`, `spec`). Mirrors `App` but with no Shopify *install* credentials (it isn't installed).
- **ToolPlan** — pricing plan for a tool: name, `model` (`FREE`/`FREEMIUM`/`PREMIUM`), base amount + interval, `trialDays` (default 7), `stripePriceId`, and **components**: `meteredComponents[]` (each → a `Meter`) and `perStore` (bool + per-unit price). FREE has no Stripe price; FREEMIUM has a zero base + metered/paid add-ons with a free ceiling.

### Availability (unified, v2 — replaces AgencyApp-as-availability)
- **Availability** — policy per product `(productType: APP|TOOL, productId)`: `mode` (`PRIVATE` = allowlist | `PUBLIC` = available to all, with exclusions). 
- **AvailabilityEntry** — `(productType, productId, agencyId, effect: ALLOW|DENY)`. PRIVATE uses ALLOW rows; PUBLIC uses DENY rows (exclusions). 
- **AgencyApp** — *retained* but narrowed to its commission-override role: `(agencyId, appId, rateBps?, commissionModel?, flatAmount?)`. Availability for apps now resolves through `Availability` (migration: existing `AgencyApp` rows seed PRIVATE ALLOW entries). Redaction still gated on no ACTIVE installs.

### Distribution — Apps
- **Store** — a Shopify store connected by an agency: shopDomain, **`accessTokenEnc`** (OAuth **offline** token — v2 hardens: records `grantedScopes`, `tokenRotatedAt`, owned by the Store Bridge), owning `agencyId`.
- **Installation** — App ⨯ Store. Immutable `agencyId` (referral, I-8), `appPlanId`, status (`PENDING`/`ACTIVE`/`UNINSTALLED`), optional per-install plan override.

### Distribution — Tools **(v2)**
- **StoreBridgeConnection** — `(toolId, storeId)` link: `grantedScopes`, `status` (`ACTIVE`/`REVOKED`), `connectedAt`. A live connection = the unit of per-store billing and the audit anchor for every Admin API call a tool makes against that store.
- **ToolActivation** — `(toolId, agencyId)`: how a tool is live for an agency — `source` (`GRANT` | `SUBSCRIPTION`), `status`. The agency-side analogue of `Installation`. (Access/quota is resolved by `entitlements`, not stored here as truth.)

### Money — App revenue (append-only ledgers, I-5) — outbound to agency
- **Charge** — Shopify Billing revenue event. `externalId` unique; `type` (`SUBSCRIPTION`/`USAGE`/`ONE_TIME`/`REFUND`); amount (minor, negative for refund); `shopifyFeeBps` snapshot.
- **Commission** — derived from a Charge: agencyId, chargeId (unique), `commissionModel` (`PERCENT`|`FLAT`) **(v2)**, `rateBps`/`flatAmount` snapshot, amount, status (`PENDING`/`APPROVED`/`PAID`/`REVERSED`), `type` = ledger kind (`EARNED`/`REVERSAL`/`ADJUSTMENT`).
- **Payout** — batch of commissions to one agency: total, provider (`MANUAL`/`STRIPE_CONNECT`/`PAYPAL`), providerRef, status. **Outbound.**
- **PayoutMethod** — agency payout destination per provider.

### Money — Tool revenue (append-only, I-5) — inbound from agency **(v2)**
- **Subscription** — `(agencyId, toolId, toolPlanId)`: `stripeSubscriptionId`, status (`TRIALING`/`ACTIVE`/`PAST_DUE`/`CANCELED`/`INCOMPLETE`), `trialEndsAt`, `currentPeriodEnd`.
- **Invoice** — mirror of a Stripe invoice (audit + agency spend view): `stripeInvoiceId`, agencyId, toolId, amount, currency, status (`PAID`/`OPEN`/`UNCOLLECTIBLE`/`VOID`), periodStart/End. Append-only.
- **Meter** — a metered dimension for a tool plan: `key` (e.g. `api_calls`, `active_stores`), `stripeMeterId`, `unitLabel`. 
- **UsageRecord** — append-only usage event: `(subscriptionId, meterId)`, quantity, occurredAt, `stripeMeterEventId` (idempotency). Aggregated by Stripe per period; mirrored for projected-spend.

### Entitlements **(v2)** — the access/quota authority
- **Entitlement** — the *resolved* (often cached/derived) answer for `(agencyId, toolId)`: `access` (bool), `reason` (`GRANT`/`TRIAL`/`SUBSCRIPTION`/`FREEMIUM`/`NONE`), `quota` per meter + `used` this period, `expiresAt`. Truth is computed from grants + subscriptions + usage; this entity is the materialized read-model guards check. Never the place money is decided.

### Ingress
- **WebhookEvent** — raw inbound event: `externalId` unique (idempotency), **`source`** **(v2)** (`SHOPIFY_APP` | `STRIPE` | `STORE_BRIDGE`), **`productType`/`productSlug`** **(v2)** (replaces app-only `appSlug`, F6), topic, shopDomain?, payload (jsonb), status, error.

### Settings & audit
- **Setting** — typed, validated K/V (v2 hardens money-affecting keys: `defaultCommissionRateBps`, `commissionBasis` (`GROSS`|`NET`), `minPayoutAmount`, `defaultToolTrialDays`) with an **audit trail** of changes.
- **AuditLog** **(v2)** — append-only record of privileged actions (availability changes, grants, publishes, payout releases, Store Bridge scope grants). Required by `07-quality/audit-mechanism.md`.

### Support
- **Ticket / TicketMessage** — app-scoped support (unchanged); v2 allows `toolId` as an alternative scope.

## Relationship summary

```
User ──< UserRole >── Role ──< RolePermission >── Permission
User ──< AgencyMember >── Agency
Agency ──< Store ──< Installation >── App ──< AppPlan
Agency ──< Store ──< StoreBridgeConnection >── Tool ──< ToolPlan          (v2)
Agency ──< ToolActivation >── Tool                                        (v2)
Installation ──< Charge ──1 Commission >── Agency ──< Payout              (App money, outbound)
Agency ──< Subscription >── Tool ;  Subscription ──< UsageRecord >── Meter (v2, Tool money, inbound)
Agency ──< Invoice >── Tool                                               (v2)
Availability (productType, productId) ──< AvailabilityEntry >── Agency    (v2, apps + tools)
Entitlement (agencyId, toolId)  ◄ derived from grants + Subscription + UsageRecord   (v2)
WebhookEvent (source, productType, productSlug)                          (standalone)
```

## Lifecycles

**Commission (App):** `Charge ingested → Commission(PENDING) → admin approves → APPROVED → Payout(DRAFT) → provider releases → PAID`. Refund → `REVERSAL` (negative) linked to original.

**Subscription (Tool):** `subscribe → TRIALING (7d) → ACTIVE → (PAST_DUE on failed invoice → ACTIVE on recovery | CANCELED)`. Admin **GRANT** sets a `ToolActivation(source=GRANT)` that yields access with no Stripe object.

**Entitlement resolution (Tool, every gated request):** `access = GRANT? true : (SUBSCRIPTION active|trialing AND within quota) ? true : (FREEMIUM AND under free ceiling) ? true : false`. Quota for metered features = plan allowance − `used` this period.
