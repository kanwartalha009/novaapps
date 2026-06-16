# Research: Shopify Development Capabilities

> Purpose: catalog every surface a Shopify app can touch, so the **app creation engine**
> (next phase) is designed against the real platform. Sources: shopify.dev (fetched 2026-06-10).

## 1. The app model

An "app" in Shopify is: **app configuration** (`shopify.app.toml` — name, URLs, scopes, webhooks)
+ optional **backend/web app** (App Home) + zero or more **extensions**. Everything is versioned
and deployed as a single **app version** via Shopify CLI.

| Concept | Notes |
|---|---|
| Distribution | **Public** (App Store, many merchants) or **Custom** (one store / one Plus org, via link). Chosen once in the Dev/Partner Dashboard — **irreversible** per app. |
| App Home | The app's UI inside Shopify admin. Two models: **iframe** (any web framework + App Bridge + Polaris — recommended) or **Shopify-hosted UI extension** (Preact, no backend needed). |
| Extension-only apps | Apps with no backend at all — just extensions (admin UI, checkout UI, Functions, customer accounts, Flow, post-purchase). Shopify hosts everything. |
| Embedded vs standalone | Public apps are effectively expected to be embedded (App Bridge) for App Store quality bars. |

## 2. API surfaces

| API | What it's for | Notes |
|---|---|---|
| **Admin GraphQL API** | Everything in the admin: products, orders, customers, inventory, discounts, fulfillment, metafields, files, themes | Primary API; REST Admin is legacy/frozen. Scope-gated (`read_products`, `write_orders`, …) |
| **Storefront API** | Headless/custom storefronts: products, collections, cart, checkout handoff | Public tokens; metafields must be explicitly exposed via Admin API |
| **Customer Account API** | Authenticated customer data on new customer accounts | Pairs with customer account UI extensions |
| **Payments Apps API** | Payment providers resolve/reject payment sessions | Separate approval track (payments partner) |
| **Partner/Dev Dashboard** | App management, dev stores | **No public API to create apps programmatically** — creation happens via Dashboard or Shopify CLI auth flows |
| **Webhooks / Events** | Push notifications (HTTPS, EventBridge, Pub/Sub) | Declared in `shopify.app.toml` (`[[events.subscription]]` with optional GraphQL payload queries + filters); HMAC-verified |
| **Metafields & metaobjects** | Extend Shopify's data model with custom fields and whole custom resources | App-owned namespaces; storefront visibility controllable |

## 3. Extension surfaces (the full menu)

From shopify.dev "List of app extensions" + surface guides:

### Shopify admin
| Extension | What it does | Review needed |
|---|---|---|
| Admin actions | Custom modals on resource pages (orders, products, customers) | No |
| Admin blocks | Custom cards on resource pages | No |
| Admin links | Quick links to the app from admin pages | No |
| Navigation links | App nav items across devices | No |
| Product configuration | Bundle interaction on product page | No |
| Discount function settings | Config UI for app-defined discounts | No |
| Purchase options / subscription link | Selling-plan UX hooks | No |
| Channel config | Declare the app as a **sales channel** | Yes (channel approval) |
| Marketing activities | Campaign creation embedded in Shopify Marketing | Yes |

### Checkout & purchase flow
| Extension | What it does | Constraint |
|---|---|---|
| Checkout UI extensions | Blocks at defined checkout targets (info/shipping/payment steps, order summary) | Info/shipping/payment steps render **only on Shopify Plus** stores; Thank-you/Order-status work on all plans (except Starter) |
| Post-purchase extensions | Upsell page after payment, before thank-you | JWT-signed; review required |
| Thank you / Order status extensions | Same toolkit as checkout UI | All plans except Starter |
| Web pixel extensions | Sandboxed analytics pixels subscribing to customer events | Replaces script tags for tracking |
| Payments extensions | Offsite/credit-card/alternative payment methods | Payments partner approval |

### Shopify Functions (server-side custom logic, no infra — runs inside Shopify)
WASM modules (Rust/JS) scaffolded by CLI (`shopify app generate extension`), executed in purchase flows:

| Function API | Replaces / enables |
|---|---|
| Discounts | Custom discount types (product/order/shipping) |
| Cart Transform | Bundles: merge/expand cart lines, override price/title/image (max **one per app per store**; line updates Plus-only) |
| Cart & Checkout Validation | Block checkout on custom rules |
| Delivery Customization | Hide/rename/reorder shipping options |
| Payment Customization | Hide/rename/reorder payment methods |
| Fulfillment Constraints | Custom fulfillment/delivery strategy |
| Local Pickup / Pickup Points | Generate pickup options |
| Order/Location Routing | Choose fulfillment location |

Performance-critical (run inside checkout); input is a GraphQL query the function declares.

### Online store (themes)
| Mechanism | What it does | Constraint |
|---|---|---|
| **Theme app extensions** | App-provided Liquid **app blocks** (placeable in sections via theme editor) and **app embeds** (floating/overlay, head/body injection). Assets served from Shopify CDN. Versioned, deployed with the app, cleanly removed on uninstall | **Mandatory** for App Store apps that touch themes. No theme code edits |
| ScriptTag | Legacy script injection for vintage themes | Discouraged; blocks theme upgrades; not acceptable for new App Store apps |
| Asset/Theme APIs | Programmatic theme file manipulation | For theme tooling, not app↔theme integration |

### Customer accounts, POS, Flow
| Extension | What it does |
|---|---|
| Customer account UI extensions | Blocks/actions on order index, order status, profile pages |
| POS UI extensions | Smart grid tiles, cart, post-purchase screens in POS |
| Flow actions / triggers / templates | App becomes a node in merchants' Shopify Flow automations |

## 4. Standalone storefront tracks (separate products, not "apps")

| Track | What it is |
|---|---|
| **Themes** | Full Liquid themes (OS 2.0: JSON templates, sections, blocks). Built with Theme CLI; distributed via the **Theme Store** (separate review track) or sold directly. A theme is NOT an app — different artifact, different store |
| **Hydrogen / Oxygen** | React Router-based headless storefront toolkit + Shopify hosting. Uses Storefront API |
| **Storefront Web Components / Headless channel** | Drop-in components or any-stack headless against Storefront API |

## 5. Tooling & lifecycle (what the engine automates)

```
shopify app init --template <template|github-url>     # scaffold (official or OUR OWN templates)
shopify app generate extension                         # add any extension type to the project
shopify app dev                                        # local dev against a dev store (tunnel)
shopify app deploy [--no-release] [--version v]        # create+release an APP VERSION
shopify app release                                    # promote a created version
```

- `shopify.app.toml` is **config-as-code**: name, application_url, embedded, access_scopes,
  webhooks/event subscriptions (with payload queries + filters), redirect URLs.
- **CI/CD is first-class**: `deploy` runs headless in pipelines (auth via CLI token + client id).
  Everything in the project deploys atomically as one version; rollback via `release`.
- **Custom GitHub templates** are supported by `app init` — the engine's core lever.
- Dev stores are free sandboxes for testing; `app dev` hot-reloads extensions into them.

## 6. Publishing & review (the manual gate)

1. Create app (Dashboard or CLI) → choose **distribution** (public/custom, irreversible).
2. Public apps: complete App Store listing, pass automated checks on the review page, then
   human review (Draft → Submitted → Reviewed → Published). Status emails; fixes loop.
3. Requirements include: Shopify **Billing API** for charging, mandatory **GDPR webhooks**
   (`customers/data_request`, `customers/redact`, `shop/redact`), OAuth before any other page,
   embedded + Polaris quality bars, theme integration only via theme app extensions.
4. Some extension types add their own review (channels, payments, marketing activities, post-purchase).

**Not programmable:** app creation in the Partner org, distribution selection, listing content
submission, and the human review itself. Everything after (versions, deploys, config) is CLI-automatable.

## Sources
- shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions
- shopify.dev/docs/apps/build/app-surfaces · /build/checkout · /build/online-store · /build/online-store/theme-app-extensions
- shopify.dev/docs/api/functions/latest (+ cart-transform)
- shopify.dev/docs/apps/build/cli-for-apps · /launch/deployment/deploy-in-ci-cd-pipeline
- shopify.dev/docs/apps/launch/distribution/select-distribution-method · /launch/app-store-review/review-process
- shopify.dev/docs/storefronts/headless/getting-started/build-options
- shopify.dev/docs/api/admin-rest/latest/resources/recurringapplicationcharge (billing statuses)
