# Module: tools-registry

**Owns:** Tool catalog, tool plans (Stripe-backed), tool metadata + module manifest. The Tool-class analogue of `apps-registry`.
**Depends on:** (none). **Consumed by:** tool-engine, store-bridge, subscriptions, entitlements, agency catalog, admin shell.

## Behavior
- Admin registers each Tool: name, slug, description, icon, **`toolType`** (`AGENCY` | `STORE` | `HYBRID`), `usesStoreBridge`, `requiredScopes[]` (Shopify Admin scopes the Bridge must hold for this tool — least privilege), status (`DRAFT` → `PUBLISHED` → `DELISTED`).
- Engine fields (written by `tool-engine`): `repoUrl`, `moduleManifest (jsonb)`, `latestVersion`, `releaseChecklist (jsonb)`, `spec (jsonb)`.
- **No Shopify *install* credentials** (a tool isn't installed). Store access is brokered by `store-bridge` using the agency's per-store offline token.
- **Plans** (`ToolPlan`): `model` (FREE/FREEMIUM/PREMIUM), base amount + interval, `trialDays` (default 7), `stripePriceId`, `meteredComponents[]` (each → a `Meter`), `perStore` (bool + unit price). FREE has no Stripe price; FREEMIUM = zero base + metered/paid add-ons with a free ceiling enforced by `entitlements`.
- **Availability** is resolved through the unified `Availability` policy (ADR-011), not stored here.
- Status semantics mirror apps: `PUBLISHED` = offerable (subject to availability); `DELISTED` = hidden from catalogs, existing activations keep working.

## Endpoints
```
GET/POST/PATCH /admin/tools                 [tools:*]
POST /admin/tools/:id/publish               [tools:publish]
GET/POST/PATCH /admin/tools/:id/plans       [tools:write]   (syncs Stripe via subscriptions/metering)
GET  /catalog/tools                         (agency aud — published + available only)
```

## Invariants / notes
- Product class fixed at creation (I-11). `toolType` change = re-create.
- Plan changes that alter Stripe objects go through `subscriptions`/`metering` (single writer to Stripe).
- C2 on add: `Tool`, `ToolPlan`, `Meter` models (`domain-model.md`).
