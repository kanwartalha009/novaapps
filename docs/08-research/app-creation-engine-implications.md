# App Creation Engine — Design Implications

> Derived from `shopify-development-capabilities.md`. This is the proposal to react to
> BEFORE we spec the engine as a module (change-control: new module = C2 against
> apps-registry, architecture review recommended).

## 1. What the engine can and cannot automate

| Step | Automatable? | Mechanism |
|---|---|---|
| Scaffold app code | ✅ | `shopify app init --template <our GitHub template>` |
| Add modules (extensions) | ✅ | `shopify app generate extension` + our generators |
| App config (scopes, webhooks, URLs) | ✅ | Engine writes `shopify.app.toml` (config-as-code) |
| Local/dev-store testing | ✅ | `shopify app dev` (developer runs; engine provides scripts) |
| Versioned deploy + rollback | ✅ | `shopify app deploy` headless in CI (CLI token + client id) |
| Backend hosting | ✅ | Engine deploys app backends to Railway (same as platform API) |
| Create the app in the Partner org | ⚠️ semi | No public API — one-time manual create (or CLI interactive); engine stores the resulting `client_id` |
| Choose distribution (public/custom) | ❌ manual | Dashboard only, irreversible |
| App Store listing + review | ❌ manual | Human review loop (Draft→Submitted→Reviewed→Published) |

**Conclusion:** the engine is a *factory + pipeline*, not a *publisher*. Publishing remains a
human checklist tracked in our admin (status fields on the App registry), which fits the
existing `App.status: DRAFT → PUBLISHED` model.

## 2. Proposed module taxonomy for the engine

Each Nova app = one Shopify CLI project (own repo) assembled from typed modules:

| Nova module type | Shopify artifact | Notes |
|---|---|---|
| `backend` | App Home (iframe, Remix/Nest template) + Admin GraphQL | Hosted by us (Railway). Auth, billing, webhooks pre-wired to Nova conventions |
| `admin-ui` | Admin actions/blocks/links extensions | No review |
| `storefront-widget` | **Theme app extension** (app block / app embed) | The ONLY App-Store-legal theme integration |
| `checkout` | Checkout UI extension (+ thank-you/order-status) | Plus-only targets flagged in engine UI |
| `function-*` | Shopify Functions (discount, cart-transform, validation, delivery, payment) | One cart-transform per app — engine enforces |
| `pixel` | Web pixel extension | For analytics apps |
| `customer-account` | Customer account UI extension | |
| `flow` | Flow actions/triggers/templates | |
| `pos` | POS UI extension | |
| Full themes / Hydrogen storefronts | — | **Out of scope for the app engine** — different artifact + Theme Store track. Could be a future separate engine |

Mandatory baseline injected into every generated app: OAuth, Billing API plans (synced from
Nova `AppPlan` rows), GDPR webhook handlers, `app/uninstalled` + `app_subscriptions/update`
forwarding to the Nova platform webhook ingress (this is how billing/commissions get their data — already spec'd).

## 3. Engine architecture sketch (for discussion)

```
Nova Admin (UI)            Engine (new API module)         Per-app artifacts
─────────────────          ───────────────────────         ─────────────────
"Create app" wizard   →    template registry (GitHub)  →   new repo from template
pick modules          →    generator: TOML + extension     (backend + extensions)
configure scopes/plans→    scaffolds + Nova wiring     →   CI: shopify app deploy
                           registry sync               →   Railway deploy (backend)
App detail page       ←    status/webhooks/versions    ←   running app
"Publish checklist"   ←    manual steps tracker (listing, review, distribution)
```

- **Engine state lives in the existing `App` registry** (new fields: repoUrl, clientId,
  moduleManifest, latestVersion) — C2 change to apps-registry when we spec it.
- Generated apps talk to Nova via two signed channels (already spec'd): install-confirm
  callback and Shopify webhook forwarding.

## 4. Decisions (Kanwar, 2026-06-10)

1. **Repo strategy:** ~~one GitHub repo per app~~ → **AMENDED 2026-06-10-b (Kanwar):
   app backends live INSIDE the platform monorepo, hosted by `apps/app-admin` (Next.js, :3003)
   under `/apps/[appSlug]`.** One deployment serves all app backends; per-app repos may return
   later for apps that outgrow the shared host (C3 review then).
2. **Backend template stack:** ~~Shopify Remix template~~ → **AMENDED 2026-06-10-b: Next.js
   route modules inside `app-admin` + Nova wiring layer.** The engine generates route folders
   (`apps/[slug]/`, `api/apps/[slug]/...`) instead of separate repos. Extensions (theme,
   functions, checkout) still ship via Shopify CLI projects per app — only the BACKEND is shared.
3. **Creation mode:** ✅ dev-assisted — engine generates skeleton + wiring; developers build features; CI deploys.
4. **Scope of v1:** ✅ ALL module types — backend, storefront-widget, function-discount, checkout, pixel, customer-account, flow, pos. (Engine UI may stage their rollout, but the taxonomy and generators are designed for the full set from day one.)
5. **Partner org:** ✅ all apps under ONE Nova Shopify Partner organization (single review identity, single `SHOPIFY_CLI_PARTNERS_TOKEN` for CI, client_ids stored per app in the registry).

**Next step:** spec the engine as `docs/03-modules/engine.md` + C2 extension of apps-registry
(new App fields: repoUrl, clientId, moduleManifest, latestVersion, publishChecklist).
