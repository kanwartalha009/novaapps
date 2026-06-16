# Module: stores

**Owns:** Shopify stores connected by agencies; store-level Shopify OAuth.
**Depends on:** agencies. **Consumed by:** installations.

## Behavior
- Agency connects a store by shop domain. Verification strategy (Phase 2): lightweight OAuth/handshake or manual verification by admin — connecting a store does NOT install any app yet.
- A store belongs to exactly one agency (unique `shopDomain`). Transferring a store between agencies is admin-only and does not retro-change attribution of existing installations (I-8).
- Tokens encrypted at rest; never returned by the API.

## Endpoints
```
GET/POST   /agencies/me/stores           (agency aud)
DELETE     /agencies/me/stores/:id       (OWNER; only if no ACTIVE installations)
GET        /admin/stores                 [stores:read]
```
