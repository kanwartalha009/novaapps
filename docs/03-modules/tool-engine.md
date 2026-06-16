# Module: tool-engine

**Owns:** Tool scaffolding, per-tool DB provisioning, version/deploy orchestration, release checklist. The Tool-class analogue of `engine`. (ADR-010)
**Depends on:** tools-registry. **Consumed by:** Tool Shell (`apps/tool-admin`).

## What it does
1. **Create** — from the Tool blueprint (`Tool.spec`): create a repo from **`nova-tool-template`**, provision the **per-tool Postgres DB** (`TOOL_DB_URL__<SLUG>`), write the registry row (`DRAFT`) + `moduleManifest`. The template ships Nova wiring:
   - **entitlement client** (server-side checks, I-12),
   - **Store Bridge client** if `usesStoreBridge` (calls the proxy; never holds tokens, I-13),
   - **webhook relay** target (`/v1/webhooks/store-bridge/:toolSlug`),
   - **usage reporter** (`/v1/tools/:slug/usage`).
2. **Plans → Stripe** — for each `ToolPlan`, call `subscriptions`/`metering` to create Stripe products/prices/meters; write ids back to the registry. (Single Stripe writer rule.)
3. **Deploy** — generated CI deploys the tool backend (Railway) and reports `latestVersion` via `POST /internal/tool-engine/ci-callback` (HMAC).
4. **Release checklist** — tracked steps: Stripe plans live, entitlement checks verified, Store Bridge `requiredScopes` approved, (STORE/HYBRID) dev-store smoke test, availability set → `PUBLISHED`.

## Shared with `engine` (apps)
The repo-scaffold, CI-callback, build-pack export, and integration-contract injection are **shared generator internals** factored across `engine` + `tool-engine` (F5 cleanup). They differ only in template, money wiring (Shopify Billing vs Stripe), and data plane (install OAuth vs Store Bridge).

## Endpoints
```
POST /admin/tool-engine/tools                  [tools:write]   create (repo + DB + registry)
GET/PATCH /admin/tool-engine/tools/:id/spec    [tools:write]   blueprint CRUD
GET  /admin/tool-engine/tools/:id/spec/export  [tools:read]    build-pack markdown
GET/PATCH /admin/tool-engine/tools/:id/bridge  [tools:write]   Store Bridge scopes + relay config
GET/PATCH /admin/tool-engine/tools/:id/checklist [tools:write]
POST /internal/tool-engine/ci-callback         (HMAC)          CI version/deploy status
```

## Out of scope
Hosting tool backends (they're standalone). Payments-app approval tracks. Non-Shopify data sources (future bridges).
