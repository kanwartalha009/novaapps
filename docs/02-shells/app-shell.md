# Shell: App Shell

**Runtime:** `apps/app-admin` (Next.js · :3003 · `[app-slug].nova-platform.<domain>`). **Audience:** `app-shell` JWT. **Role:** the per-App builder/console — the workbench for **one App's** spec, scaffold, wiring, and publish lifecycle.

> **What it is NOT (F3 correction):** the App Shell does **not** host App backends. The superseded "subdomain-hosted backends in the monorepo + `apps/app-admin/db/<slug>/`" model is removed (ADR-010, engine v1 amendment). Each App is a **standalone repo with its own DB**; the App Shell orchestrates and tracks it; the platform stores metadata + credentials only.

## Sections (per app `[appSlug]`)

```
/a/[appSlug]                 overview: status, version, links (repo, listing, dashboards)
/a/[appSlug]/specs           BLUEPRINT — screen-by-screen specs + backend spec (spec-first)
/a/[appSlug]/backend         backend spec: per-app Prisma entities, endpoints, webhooks, jobs
/a/[appSlug]/features/[f]    per-module/feature detail (from moduleManifest)
/a/[appSlug]/export          BUILD-PACK export — one markdown doc to implement from
/a/[appSlug]/embed           App Home embed preview / config
/a/[appSlug]/api/auth        OAuth wiring reference (token-exchange)
/a/[appSlug]/api/webhooks    webhook subscriptions + Nova ingress forwarding config
```

## What the App Shell drives (via `engine`, ADR-007/010, `03-modules/engine.md`)
1. **Blueprint (spec-first)** — author screens (surface, Polaris page pattern, sections, data, App Bridge actions, empty/loading/error, acceptance) + backend spec, stored as `App.spec` (jsonb). Status DRAFT→READY.
2. **Create** — engine runs non-interactive `shopify app init`/`deploy` under the single Nova Partner org, captures `client_id`, creates the repo from `nova-app-template` (React Router + Nova wiring), generates `shopify.app.toml` (least-privilege scopes, GDPR + billing webhooks → Nova ingress), writes the registry row (DRAFT) + `moduleManifest`.
3. **Build-pack export** — `/export` renders the self-contained markdown an AI/dev implements from (config, conventions, screens w/ acceptance, backend, build order). Encore's is the template.
4. **Wire** — billing plans synced from `AppPlan`; install-confirm + webhook forwarding (`X-Nova-Signature`) per the integration contract.
5. **Publish checklist** — tracked manual steps (distribution choice irreversible, billing test, GDPR, listing, review) → `PUBLISHED`.

## Module taxonomy (generator targets)
`backend` (App Home) · `admin-ui` · `storefront-widget` (theme app extension) · `checkout` (Plus-flagged) · `function-*` (discount/cart-transform[max 1]/validation/delivery/payment) · `pixel` · `customer-account` · `flow` · `pos`.

## Endpoints (consumed)
```
GET/PATCH /admin/engine/apps/:id/spec          [apps:write]
GET       /admin/engine/apps/:id/spec/export   [apps:read]
POST      /admin/engine/apps                    [apps:write]   create
GET       /admin/engine/apps/:id/manifest       [apps:read]
POST      /admin/engine/apps/:id/modules        [apps:write]
GET/PATCH /admin/engine/apps/:id/checklist      [apps:write]
POST      /internal/engine/ci-callback          (HMAC)
```

## Reference implementation
**Encore** (`shopify/encore`) — the worked example for every section above (`05-product/apps.md`).
