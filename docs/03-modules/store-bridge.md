# Module: store-bridge

**Owns:** the Tool→store data plane — per-store OAuth offline tokens, the scoped/audited/rate-limited GraphQL Admin **proxy**, bridge connections, and store-event relay. (ADR-009, I-13)
**Depends on:** stores, tools-registry. **Consumed by:** tool backends (via proxy), metering (per-store unit count), webhooks (relay), entitlements (connection facts).

## Behavior

### Authorization & tokens
- A single **Nova Store Bridge** OAuth (custom-distribution) Shopify app. An agency authorizes it **per store** (`POST /agency/stores/:id/bridge/authorize` → OAuth → **offline** token). One authorization serves all the agency's tools.
- Token stored in `Store.accessTokenEnc` with `grantedScopes`, `tokenRotatedAt`. Encrypted at rest; **never returned by any API**; rotatable by the Bridge.
- Custom apps (single-store, non-rotatable) are explicitly NOT used (research 2026-06).

### The proxy (only way a tool touches a store — I-13)
```
Tool backend ──► POST /v1/bridge/:toolSlug/graphql   (X-Nova-Signature; body = GraphQL op + storeId)
  store-bridge:
    1. authn the tool (signed) + resolve StoreBridgeConnection(tool, store) ACTIVE
    2. authz: tool.requiredScopes ⊆ Store.grantedScopes  else 403
    3. entitlement gate (I-12): agency entitled to this tool? else 402/403
    4. cost budget: enforce per-store Shopify GraphQL cost ceiling; back off/queue if exceeded
    5. attach offline token, call Shopify GraphQL Admin, return result
    6. write AuditLog (tool, store, op, cost, outcome)
```
- GraphQL only (REST Admin is legacy). The Bridge owns Shopify API version pinning + cost accounting centrally so one tool can't exhaust an agency's budget (scale posture).

### Connections & per-store billing
- `StoreBridgeConnection(toolId, storeId, grantedScopes, status, connectedAt)`. Created when a tool is first pointed at a store; an **ACTIVE** connection is the **per-store billable unit** → `metering` reports the count to the `active_stores` meter (ADR-008).
- Revoke (agency or admin) → connection `REVOKED`, token access for that tool killed immediately; billing for that unit stops next period.

### Webhook relay
- The Bridge subscribes tool-relevant store webhooks and relays them to platform ingress `POST /v1/webhooks/store-bridge/:toolSlug` (`X-Nova-Signature`, `X-Nova-Topic`). Stored as `WebhookEvent(source=STORE_BRIDGE, productType=TOOL, productSlug=:toolSlug)` (F6), idempotent on `X-Shopify-Webhook-Id`, processed async, routed to the tool.

## Endpoints
```
POST /agency/stores/:id/bridge/authorize     [agency]    OAuth start → offline token
POST /v1/bridge/:toolSlug/graphql            (HMAC)      scoped Admin proxy (tool → store)
GET  /admin/bridge/connections               [tools:read] connections + audit summary
POST /admin/bridge/connections/:id/revoke    [tools:write]
POST /v1/webhooks/store-bridge/:toolSlug     (HMAC)      relayed store events
```

## Security requirements (tested in 07-quality)
- Least-privilege scopes per tool; admin approves `requiredScopes` at publish.
- Every store call audited; revoke is immediate and complete.
- Tokens never leave the Bridge; tools receive data, never credentials.
- Rate/cost limits enforced server-side per store.
