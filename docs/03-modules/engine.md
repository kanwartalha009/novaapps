# Module: engine (app creation engine)

**Owns:** app scaffolding, module generation, version/deploy orchestration, publish checklist.
**Depends on:** apps-registry (extends the App record). **Consumed by:** admin app ("Create app" wizard).
**Research basis:** `docs/08-research/` (capabilities + decisions, 2026-06-10). **Shared internals with `tool-engine`** (F5, ADR-010).

> ### v1 amendment (2026-06-12) — standalone repo per app  ⟵ supersedes the conflicting decisions below
> Each Shopify app is **its own repo** (`shopify/<slug>` for local dev → `github.com/<org>/<slug>`),
> owning its own backend, `shopify.app.toml`, extensions, **and** its Prisma schema + migration
> history (`<app>/prisma`). The platform monorepo stores **metadata + credentials only**
> (apps-registry); `apps/app-admin` is the platform-side **app-builder / engine console** (blueprint
> specs, build-pack export, create/deploy orchestration) — **not** the runtime host of app backends.
> The previous `apps/app-admin/db/<slug>/` location and the "backends hosted by app-admin at
> subdomains" model are removed. Worked example + runbook: `docs/process/`. App↔platform wiring:
> `shopify/encore/NOVA-INTEGRATION-CONTRACT.md`.

## Decisions in force (amended 2026-06-10-c)
One Shopify Partner org for all apps · app backends hosted in the platform monorepo by
`apps/app-admin` (Next.js, :3003) · **subdomain per app: `[app-slug].nova-platform.localhost:3003`
(prod: `[app-slug].<domain>`) — middleware rewrites to internal `/a/[slug]`; public routes
carry NO `/apps/` prefix** · extensions still ship via per-app Shopify CLI projects ·
dev-assisted creation · full module taxonomy from day one.

**App creation stays on the platform admin (:3001).** Created apps get their OWN admin panel
on their subdomain — sections generated from the module manifest, tied to the app. A launched
subdomain shows only that app's backend.

Each app subdomain serves: admin panel (`/`), App Home embed (`/embed`), OAuth (`/api/auth`),
webhook receiver (`/api/webhooks` → app-local writes + forwards billing/lifecycle topics to
platform ingress).

**Per-app databases (2026-06-10-c):** one Postgres database + one independent Prisma schema
and migration history per app at `apps/app-admin/db/<slug>/` (env: `APP_DB_URL__<SLUG>`).
The master/platform DB (`packages/database`) is unchanged and shared by the master admin only.
DB connection + migrations are configured per app on the admin app detail page (Database card).

## What the engine does

1. **Create** — wizard collects name/slug, module selection, scopes, plans → engine:
   - **creates the app in the Shopify org (amendment 2026-06-11-d):** runs
     `shopify app init --name <name> --organization-id $SHOPIFY_ORG_ID` non-interactively
     (CI auth via `SHOPIFY_CLI_PARTNERS_TOKEN`), then `shopify app deploy` to push
     `shopify.app.toml`; the returned `client_id` is captured into the registry,
   - creates GitHub repo from `nova-app-template` (Remix + Nova wiring),
   - generates `shopify.app.toml` (scopes, GDPR + billing webhook subscriptions pointing at
     Nova ingress `/v1/webhooks/shopify/:appSlug`, app URL on Railway),
   - generates selected extension scaffolds (`shopify app generate extension` equivalents,
     committed to the repo),
   - registers the App row (status `DRAFT`) with `moduleManifest`.
2. **Wire** — every generated app includes the Nova layer:
   - billing plans synced from `AppPlan` rows (engine writes plan constants; Billing API
     mutations use them),
   - install-confirm callback → `POST /v1/internal/installations/confirm` (HMAC-signed),
   - mandatory GDPR webhooks + `app/uninstalled` + `app_subscriptions/update` forwarded to ingress.
3. **Deploy** — repo CI (GitHub Actions, generated) runs `shopify app deploy` (headless:
   `SHOPIFY_CLI_PARTNERS_TOKEN` org secret + per-app `client_id`) and deploys the backend to
   Railway. Engine records `latestVersion` via CI callback.
4. **Publish checklist** — tracked manual steps on the App detail page (cannot be automated):
   distribution chosen (public/custom — irreversible), billing tested, GDPR verified, listing
   drafted, review submitted → statuses mirrored manually until `PUBLISHED`.

## Amendment 2026-06-11-d (C2)
"App created in Partner org" moves from the manual checklist into the engine create step.
Basis: Shopify CLI supports non-interactive app creation (`app init --name --client-id/--organization-id`
flags; CI token auth) — see shopify.dev CLI reference. The checklist item remains as a tracked,
**automated** entry (`automated: true` in fixtures) so the audit trail per app is preserved.
Remaining truly-manual steps: distribution, billing test, GDPR verification, listing, review.
After creation, the success drawer's primary CTA opens the app's own dashboard at
`[slug].nova-platform.localhost:3003` — the working surface for further app development.

## Amendment 2026-06-11-e (C2) — app blueprint (spec-first build)
Each app's skeleton is authored on its own panel (app-admin → Build section) BEFORE code:
**screen-by-screen specs** (surface, Polaris page pattern template, route/target, ordered
sections as compositions + web components, data per section, App Bridge actions,
empty/loading/error states, acceptance criteria, DRAFT/READY status) and a **backend spec**
(per-app Prisma entities, endpoints with auth mode, webhook handlers, scheduled jobs,
Admin GraphQL usage). Grounded in shopify.dev App Home guidance (React Router template,
Polaris patterns: templates + compositions, App Bridge chrome).
The **build pack export** (`/export`) renders one self-contained markdown document that
Claude Cowork pulls to implement the app — config, conventions, screens with acceptance
checklists, backend, and build order. New endpoints (Phase E):
```
GET/PATCH /admin/engine/apps/:id/spec         [apps:write]  blueprint CRUD (screens + backend)
GET       /admin/engine/apps/:id/spec/export  [apps:read]   build pack markdown
```
`App` additionally gains `spec (jsonb)`.

## Module taxonomy (generator targets)

`backend` (App Home, Remix) · `admin-ui` (actions/blocks/links) · `storefront-widget`
(theme app extension: app block / app embed) · `checkout` (checkout UI + thank-you/order-status;
Plus-only targets labeled) · `function-discount` | `function-cart-transform` (max 1/app, enforced)
| `function-validation` | `function-delivery` | `function-payment` · `pixel` · `customer-account`
· `flow` · `pos`.

## Constraints enforced by the engine
- Theme integration ONLY via theme app extensions (App Store rule).
- One cart-transform function per app.
- Checkout info/shipping/payment-step extensions flagged "Plus-only reach".
- GDPR topics always present; cannot be deselected.
- Distribution choice is irreversible → wizard warns, requires typed confirmation, and it's a
  tracked manual step (no API exists).

## Endpoints (Phase E)
```
POST /admin/engine/apps                      [apps:write]   create (repo + scaffold + registry row)
GET  /admin/engine/apps/:id/manifest          [apps:read]    module manifest + generation log
POST /admin/engine/apps/:id/modules           [apps:write]   add module scaffold (commits to repo)
POST /internal/engine/ci-callback             (HMAC)         CI reports version/deploy status
GET/PATCH /admin/engine/apps/:id/checklist    [apps:write]   publish checklist state
```

## C2 contract change — apps-registry / domain model
`App` gains: `repoUrl`, `shopifyClientId`, `moduleManifest (jsonb)`, `latestVersion`,
`publishChecklist (jsonb)`. Consumers: apps-registry endpoints, admin app detail page, engine.
Schema migration lands with implementation (no code change yet — spec only).

## Out of scope
Full themes / Theme Store, Hydrogen storefronts (separate artifact tracks — future engines).
Payments apps (separate partner approval track).
