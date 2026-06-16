# ADR-009: Store Bridge — the Tool→store data plane

**Status:** Accepted · 2026-06-14 · Class: C3 (adds I-13) · Depends on ADR-007.

## Context
Apps get store data by being installed (Shopify OAuth at install + webhooks). **Tools aren't installed** but many still need to read/write a store, often **many stores for one agency**. Research (2026-06): Shopify **custom apps created in a store admin are single-store and can't rotate credentials** — unusable for multi-store agency tooling. The supported path for SaaS/agency/multi-store is the **OAuth flow with offline access tokens** (valid until the app is uninstalled), using the **GraphQL Admin API** (REST is legacy). Concentrating many stores' credentials behind tool code is also the system's largest security blast radius.

## Decision
Introduce the **Store Bridge**: a platform-owned data plane, not a per-tool concern.

1. **One Nova-owned OAuth (custom-distribution) Shopify app** ("Nova Store Bridge") that an agency authorizes per store, minting an **offline access token** stored in `Store.accessTokenEnc` with recorded `grantedScopes` + `tokenRotatedAt` (F9). One authorization per store serves all the agency's tools.
2. **Tools never hold tokens or call Shopify directly (I-13).** They call the Bridge's **scoped, audited, rate-limited GraphQL Admin proxy**: `store-bridge` checks the tool's `requiredScopes` ⊆ granted scopes, attaches the token, enforces a per-store **cost budget**, and writes an `AuditLog` + ties the call to a `StoreBridgeConnection`.
3. **Webhooks** for tool-relevant store events are subscribed by the Bridge and **relayed through the platform's verified ingress** (`/v1/webhooks/store-bridge/:toolSlug`, `X-Nova-Signature`), reusing the existing idempotent `WebhookEvent` table (now `source=STORE_BRIDGE`).
4. **Per-store billing unit** = an **active `StoreBridgeConnection`**; reported to the `active_stores` Stripe meter (ADR-008).

## Consequences
- `Store` is hardened into a first-class, scoped, rotatable credential owned by the Bridge; Apps' install-time tokens remain separate (an App's OAuth token and the Bridge token are distinct grants — G3b resolved: two credentials, one `Store` row).
- Central rate-limit/cost governance prevents one tool from exhausting an agency's Shopify API budget (scale posture).
- Security requirements (least-privilege scopes per tool, full audit, revoke = kill all that tool's store access) are concentrated and testable (`07-quality`).
- Adds env/secrets for the Nova Store Bridge app (`SHOPIFY_BRIDGE_CLIENT_ID/SECRET`, scopes config).
- A tool declaring `usesStoreBridge=false` (pure agency tool) never touches this path.
