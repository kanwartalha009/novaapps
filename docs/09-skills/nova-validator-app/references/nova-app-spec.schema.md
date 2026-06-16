# Nova App Spec — schema

The structured output of `nova-validator-app` and the input to `nova-spec-ingestor`. Same shape the registry seeds. Emit as a markdown doc with this front-matter block + sections. Fields marked **(req)** must be present or the ingestor routes it back.

```yaml
spec_kind: nova-app-spec
manifest_version: 1
product_class: APP          # (req) fixed
name:                       # (req)
slug:                       # (req) kebab-case, unique
one_liner:                  # (req)
status: DRAFT
verdict:                    # (req) GO | REVISE | NO-GO  (from the validator)
pricing:
  model:                    # (req) FREE | FREEMIUM | PREMIUM
  plans:                    # AppPlan rows
    - name: ; amount_minor: ; currency: USD; interval: EVERY_30_DAYS|ANNUAL; trial_days: ; shopify_handle:
commission:
  type: PERCENT|FLAT        # to the agency (ADR-012)
  rate_bps:  | flat_amount_minor:
  basis: GROSS|NET
shopify:
  scopes: [ ]               # least privilege
  extension_modules: [ ]    # from App module taxonomy in the manifest
  webhooks: [ app/uninstalled, app_subscriptions/update, customers/data_request, customers/redact, shop/redact ]
availability:
  mode: PRIVATE|PUBLIC
  allow: [ ] | deny: [ ]
```

## Required narrative sections
1. **Problem & ICP** (req) — who, what pain, why now.
2. **Idea validation** (req) — demand signals, competitors (name them + pricing), differentiation, **Shopify policy/ToS risks**.
3. **Platform fit** (req) — maps to which App modules/extensions; any manifest features it needs that Nova lacks (→ flag).
4. **Pricing rationale** (req) — why these plans/tiers/trial, benchmarked to competitors.
5. **Screens (blueprint seed)** — per screen: surface, Polaris page pattern, sections, data, App Bridge actions, empty/loading/error, acceptance.
6. **Backend (seed)** — per-app entities, endpoints (+auth mode), webhook handlers, jobs, Admin GraphQL usage.
7. **Shortcomings & risks** (req) — technical, billing, policy, GTM — each with severity + mitigation.
8. **Open questions** — anything the validator couldn't resolve.

The ingestor reads the YAML block to seed `App`/`AppPlan`/`Availability`/`moduleManifest` and turns sections 5–6 into the build-pack + delivery plan.
