# Module: apps (registry)

**Owns:** App catalog, pricing plans, Shopify credentials per app.
**Depends on:** (none). **Consumed by:** installations, billing, agency app catalog.

## Behavior
- Admin registers each Shopify app: name, slug, description, listing URL, icon, Shopify API key + secret (encrypted at rest with `APP_ENCRYPTION_KEY`), webhook secret.
- Status: `DRAFT` → `PUBLISHED` (visible in agency catalog) → `DELISTED` (hidden; existing installs keep working).
- Agency availability = `PUBLISHED` **and** an `AgencyApp` assignment (opt-in per agency; managed app-side on the app detail → Agencies tab). Redacting an agency's access is gated on that agency having **no active installations** (see agencies module). This is distinct from `DELISTED`, which soft-hides the app from all catalogs while keeping installs working.
- Pricing: `pricingModel` = FREE | FREEMIUM | PREMIUM; `AppPlan[]` rows with price (minor units), interval (`EVERY_30_DAYS` | `ANNUAL`), trialDays, shopifyHandle. FREE apps have zero plans; FREEMIUM has a zero-price plan + paid plans.
- The actual app codebases live OUTSIDE this monorepo. This platform stores metadata + credentials only (C3 to change).
- **C2 (2026-06-10, engine):** App gains `repoUrl`, `shopifyClientId`, `moduleManifest`, `latestVersion`, `publishChecklist` — written by the engine module (see `engine.md`). Migration lands with engine implementation.

## Endpoints
```
GET/POST/PATCH /admin/apps               [apps:*]
POST /admin/apps/:id/publish             [apps:publish]
GET/POST/PATCH /admin/apps/:id/plans     [apps:write]
GET  /catalog/apps                       (agency aud — published only)
```
