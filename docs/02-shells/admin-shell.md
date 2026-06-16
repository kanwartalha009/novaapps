# Shell: Admin Shell

**Runtime:** `apps/admin` (Next.js · :3001 · `admin.<domain>`). **Audience:** `admin` JWT. **Enforcement:** server-side RBAC (I-10); nav/actions hidden by permission are cosmetic.

**Role:** the marketplace governor. Three pillars — **Agencies**, **Apps**, **Tools** — plus the money + platform settings that span them. Creation of an App or Tool is *initiated* here, then continues in the relevant builder shell (App/Tool Shell).

## Pillars → sections → modules/permissions

```
AGENCIES
  /agencies                  list, approve, suspend            agencies:read / :approve
  /agencies/[slug]           profile, members, commission cfg  agencies:write
    · availability matrix    which apps/tools this agency gets availability:write
    · tool grants            comp a tool (GRANT, no Stripe)    tools:grant
    · commission overrides   PERCENT|FLAT per app (ADR-012)    agencies:write

APPS
  /apps                      registry list + status            apps:read
  /apps/[slug]               settings, plans, credentials      apps:write
    · availability           PRIVATE allowlist | PUBLIC denylist (ADR-011)  availability:write
    · publish                publish checklist → PUBLISHED      apps:publish
    · "Create app"           launches App Shell blueprint       apps:write
    · install/comp control   per-store plan override            apps:write

TOOLS                         (new, v2)
  /tools                     registry list + status            tools:read
  /tools/[slug]              settings, plans (Stripe), type     tools:write
    · availability           PRIVATE | PUBLIC (same policy)     availability:write
    · store-bridge scopes    requiredScopes review/approve      tools:write
    · release                release checklist → PUBLISHED      tools:publish
    · "Create tool"          launches Tool Shell blueprint      tools:write

MONEY & PLATFORM
  /charges                   App revenue ledger (read)          billing:read
  /commissions               approve/adjust/reverse             commissions:approve
  /payouts                   batches → release (providers)      payouts:release
  /subscriptions             Tool revenue: subs + invoices      subscriptions:read   (v2)
  /usage                     metered usage + projected revenue  metering:read        (v2)
  /webhook-events            ingress (Shopify/Stripe/Bridge)    webhooks:read
  /settings                  typed platform settings + audit    settings:write
  /roles, /users             RBAC                               rbac:write
  /support                   app/tool-scoped tickets            support:read
```

## Licensing controls (the heart of the Admin Shell)

| Product | Availability | Licensing levers set here |
|---|---|---|
| **App** | PRIVATE allowlist / PUBLIC denylist | commission model **PERCENT or FLAT** (ADR-012); per-agency override; per-store plan comp |
| **Tool** | PRIVATE / PUBLIC | plan catalog (FREE/FREEMIUM/PREMIUM, 7-day trial, metered, per-store); **admin GRANT** to comp an agency; price/meter config (Stripe) |

Two ways an agency gets a tool: **admin GRANT** here, or **self-serve subscribe** on the agency surface — both resolve through `entitlements` (I-12).

## Key endpoints (consumed)
```
GET/PATCH /admin/agencies, POST /admin/agencies/:id/approve
GET/POST/PATCH /admin/apps, POST /admin/apps/:id/publish, /plans
GET/POST/PATCH /admin/tools, POST /admin/tools/:id/publish, /plans            (v2)
PUT /admin/availability/:productType/:productId                               (v2, ADR-011)
POST /admin/tools/:id/grant {agencyId}                                        (v2)
GET /admin/subscriptions, GET /admin/usage                                    (v2)
GET /admin/charges, /commissions (+approve/adjust), /payouts (+release)
GET/PUT /admin/settings  (typed + audited)
```

## Notes / deltas from v1
- Adds the **Tools** pillar, **Availability** policy UI (replaces opt-in-only `AgencyApp` UX), tool **grants**, and the inbound-money sections (`/subscriptions`, `/usage`).
- "Create app/tool" hands off to the builder shells; the Admin Shell does not host product backends.
