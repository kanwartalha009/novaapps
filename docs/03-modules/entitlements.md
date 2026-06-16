# Module: entitlements

**Owns:** the single authority for "may this agency use this Tool right now, and how much quota remains?" (ADR-011, I-12)
**Depends on:** subscriptions, tools-registry, agencies (+ reads metering usage). **Consumed by:** agency surface, API guards, **tool backends** (server-side checks), store-bridge proxy.

## Behavior
- Resolves `(agencyId, toolId)` to an **`Entitlement`** read-model:
  ```
  access = GRANT ? true
         : (SUBSCRIPTION active|trialing AND withinQuota) ? true
         : (FREEMIUM AND underFreeCeiling) ? true
         : false
  reason ∈ {GRANT, TRIAL, SUBSCRIPTION, FREEMIUM, NONE}
  quota[meter] = planAllowance[meter] − usageThisPeriod[meter]      (from metering)
  expiresAt    = trialEndsAt | currentPeriodEnd | null(grant)
  ```
- **Sources combined:** admin `GRANT` (`ToolActivation source=GRANT`), Stripe `Subscription` state, trial window, freemium ceiling. Truth is computed; the `Entitlement` row is a materialized cache, invalidated on subscription/usage/grant change.
- **Enforcement points (I-12, server-side only):**
  - API guards on agency tool routes,
  - the Store Bridge proxy (no entitlement → no store call),
  - **tool backends** via the integration contract: either call `GET /v1/entitlements/:toolSlug?agencyId=` or verify a short-lived **signed entitlement token** issued at session start.
- UI gating on the agency surface is cosmetic; it reads the same resolver for hints (projected spend, "trial ends in N days", "X of Y used").

## Endpoints
```
GET  /v1/entitlements/:toolSlug              (HMAC | agency)   resolve access + quota
POST /v1/entitlements/:toolSlug/check        (HMAC)            assert access for a gated action (tool backend)
GET  /agency/entitlements                     [agency]         all of this agency's tool entitlements
POST /admin/tools/:id/grant {agencyId}        [tools:grant]    comp access (no Stripe)
POST /admin/tools/:id/grant/:agencyId/revoke  [tools:grant]
```

## Invariants / notes
- The **only** place tool access/quota is decided (I-12). No other module re-implements the rule.
- Never decides money (that's subscriptions/metering); it *reads* their state.
- Grant vs subscription both yield access; reporting distinguishes comped vs paid.
