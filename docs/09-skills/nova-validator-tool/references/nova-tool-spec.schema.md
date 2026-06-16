# Nova Tool Spec — schema

The structured output of `nova-validator-tool` and the input to `nova-spec-ingestor`. Same shape the registry seeds. Fields marked **(req)** must be present or the ingestor routes it back.

```yaml
spec_kind: nova-tool-spec
manifest_version: 1
product_class: TOOL          # (req) fixed
name:                        # (req)
slug:                        # (req) kebab-case, unique
one_liner:                   # (req)
status: DRAFT
verdict:                     # (req) GO | REVISE | NO-GO
tool_type:                   # (req) AGENCY | STORE | HYBRID
uses_store_bridge:           # (req) bool
required_scopes: [ ]         # Shopify Admin scopes (least privilege) — required if STORE/HYBRID
pricing:                     # Stripe; agency pays
  plans:                     # ToolPlan rows
    - name: ; model: FREE|FREEMIUM|PREMIUM; base_amount_minor: ; currency: USD; interval: month|year; trial_days: 7
      metered_components:    # each → a Stripe Meter
        - key: ; unit_label: ; included_qty: ; overage_price_minor:
      per_store:             # only if uses_store_bridge
        enabled: ; unit_price_minor:
availability:
  mode: PRIVATE|PUBLIC
  allow: [ ] | deny: [ ]
entitlement:
  freemium_ceiling: { }      # per-meter free allowance (if FREEMIUM)
  gated_features: [ ]        # what requires an active entitlement
```

## Required narrative sections
1. **Problem & agency JTBD** (req) — which agency job this does; manual cost today.
2. **Idea validation** (req) — demand, competitors (name + pricing), differentiation, willingness-to-pay.
3. **Type & data plane** (req) — why AGENCY/STORE/HYBRID; if Store Bridge: exactly which scopes and why (least privilege), multi-store behavior, **Bridge security/blast-radius risks**.
4. **Pricing rationale** (req) — base/metered/per-store/trial choices, benchmarked; show an **example monthly bill** for a typical agency (N stores, M usage).
5. **Entitlement & quota design** (req) — what's gated, freemium ceiling, what happens on trial end / past_due.
6. **Screens (blueprint seed)** — agency-ui screens (+ store-action surfaces if any): sections, data, states, acceptance.
7. **Backend (seed)** — per-tool entities, endpoints (+auth), jobs, **entitlement check points**, Store Bridge calls, relayed webhooks.
8. **Shortcomings & risks** (req) — technical, billing, security (Bridge), GTM — severity + mitigation.
9. **Open questions**.

The ingestor reads the YAML to seed `Tool`/`ToolPlan`/`Meter`/`Availability`/`requiredScopes`/`moduleManifest` and turns 6–7 into the build-pack + delivery plan with entitlement + Bridge wiring.
