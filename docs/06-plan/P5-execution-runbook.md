# P5 — Execution Runbook (Store Bridge)

The data plane for **STORE/HYBRID tools** (ADR-009, I-13): a Nova-owned OAuth app mints **per-store offline tokens**; tools reach stores **only** through a scoped, audited, rate-limited GraphQL Admin proxy; store webhooks relay through the platform. Tools never hold raw tokens.

> Sandbox-authorable: the broker, proxy, scope/entitlement checks, audit, connections, relay. **Mac/real-store:** the actual Shopify OAuth handshake + live Admin calls need `SHOPIFY_BRIDGE_CLIENT_ID/SECRET` + a dev store (like Encore's Partner app).

## Commit 1 — store-bridge module (backend)  `[✓ authored]`
- **OAuth broker:** `GET /agency/stores/:id/bridge/authorize` → Shopify authorize URL (Nova Store Bridge app, configured scopes); `GET /bridge/oauth/callback` → exchange code → **encrypt** offline token onto `Store.accessTokenEnc` + record `grantedScopes` + `tokenRotatedAt` (F9). One auth per store serves all the agency's tools.
- **Scoped proxy:** `POST /v1/bridge/:toolSlug/graphql` (tool HMAC `NOVA_BRIDGE_SECRET`) →
  1. resolve `StoreBridgeConnection(tool, store)` ACTIVE · 2. `tool.requiredScopes ⊆ Store.grantedScopes` else 403 · 3. **entitlement** gate (I-12) else 402 · 4. per-store **rate/cost budget** · 5. attach token, call Shopify GraphQL Admin · 6. **AuditLog** (tool, store, op, outcome). Tokens never returned to the tool.
- **Connections:** `connect` (create when a tool is first pointed at a store; scope+entitlement checked), `GET /admin/bridge/connections`, `POST /admin/bridge/connections/:id/revoke` (**immediate kill**). An ACTIVE connection = the per-store billable unit (metering reads it at P6).
- **Webhook relay:** `POST /v1/webhooks/store-bridge/:toolSlug` (HMAC) → `WebhookEvent(source=STORE_BRIDGE, productType=TOOL)` idempotent, routed to the tool.
- `.env.example`: `SHOPIFY_BRIDGE_CLIENT_ID/SECRET`, `NOVA_BRIDGE_SCOPES`, `NOVA_BRIDGE_SECRET`, `SHOPIFY_API_VERSION`.

## Commit 2 — wire the reference tool's store features  `[ ] Mac/greenfield]`
In the reference tool repo (e.g. a STORE/HYBRID variant), call the proxy via the template's `bridge.ts` (now active). A pure-`AGENCY` tool (Outreach Composer) skips this.

## Commit 3 — post-P5 security audit  `[✓ authored]`
`docs/audits/PHASE-P5-AUDIT.md` — the security suite (audit-mechanism §D): I-13, scope enforcement, entitlement gate, revoke completeness, token-never-leaks, rate-limit, audit coverage.

## Run on your Mac
```bash
pnpm build && pnpm typecheck
# real-store: set SHOPIFY_BRIDGE_* + create the Nova Store Bridge custom-distribution app;
#   agency authorizes a store → proxy a read_products query → confirm AuditLog + scope/entitlement gates.
```

## Status
- [x] Commit 1 store-bridge module (backend, authored)
- [ ] Commit 2 reference tool store features (Mac/greenfield)
- [x] Commit 3 post-P5 security audit
