# Product class: Tools

Nova-native software used **by an agency** (and, via the Store Bridge, acting **on stores**). **The agency pays Nova** (freemium + premium, 7-day trial, metered, optional per-store). Standalone repo + own DB; platform holds metadata. Reference implementation: *to build* (the Tool-class analogue of Encore).

## Tool types (fixed at creation, I-11)

| Type | Reaches | Store Bridge | Billing shape |
|---|---|---|---|
| `AGENCY` | agency users only | none | base + metered (seats/usage); no per-store |
| `STORE` | acts on stores | **required** | per-store + metered |
| `HYBRID` | agency UI **and** store actions | per-feature | base + metered + per-store (Bridge features only) |

**HYBRID rule (G3):** each feature/module declares whether it needs the Bridge. Entitlement + billing treat Bridge-using features as the per-store billable surface; agency-only features as base/metered. A `HYBRID` tool with the Bridge disabled behaves as `AGENCY`.

## Lifecycle (Admin Shell → Tool Shell → Agency surface)

```
1 REGISTER  (Admin Shell)   Tool row, class=TOOL, toolType fixed, usesStoreBridge, requiredScopes, status DRAFT
2 BUILD     (Tool Shell)     blueprint → tool-engine create (standalone repo + per-tool DB) → Stripe plans/meters → build-pack → implement
3 RELEASE   (Tool Shell)     checklist (Stripe live, entitlement checks verified, Bridge scopes approved, store smoke test) → PUBLISHED
4 AVAILABLE (Admin Shell)    Availability: PRIVATE allowlist | PUBLIC denylist (ADR-011)
5 ACTIVATE  (Agency surface) self-serve SUBSCRIBE (7-day trial → premium) OR admin GRANT (comped)
            (STORE/HYBRID also: authorize Store Bridge per store)
6 PAY/USE   (platform)       subscriptions + metering (Stripe); entitlements gate access + quota (I-12)
```

## Licensing (money from the agency)
- Plans (`ToolPlan`): **FREE / FREEMIUM / PREMIUM**; `trialDays` default **7**; `meteredComponents[]` (each → a Stripe Meter); `perStore` add-on (meter = active bridge connections).
- Two activation paths, one authority: **admin GRANT** (comped, no Stripe) or **self-serve SUBSCRIBE** (Stripe) — both resolve via `entitlements` (ADR-011, I-12).
- **Per-store charge** applies only to Store-Bridge-using tools; billable unit = an **active `StoreBridgeConnection`** (ADR-009).
- Freemium ceiling + metered quota enforced **server-side** by entitlements; the agency surface shows **projected spend** before the invoice (churn control).

## Availability
Same unified policy as apps. `PUBLISHED` = offerable; `DELISTED` hides while active subscriptions keep working until period end / cancellation.

## Data plane (STORE / HYBRID)
Store access **only** through the Store Bridge (I-13): the agency authorizes the Nova Store Bridge OAuth app per store (offline token), the tool calls the scoped/audited GraphQL proxy, store webhooks relay through platform ingress (`source=STORE_BRIDGE`). Tools never hold tokens.

## Build mechanics (the runbook, `process/`)
Spec-first blueprint → `tool-engine` scaffolds `nova-tool-template` (entitlement client + Store Bridge client if needed + usage reporter + webhook relay) → per-tool Postgres → Stripe plan/meter creation → release. Tool generator taxonomy: agency-ui · store-actions · jobs · webhooks · api · entitlement-gates.

## Reference tool (to build — Phase T)
Recommended first tool: an **agency-facing** tool with **light Store Bridge** use (e.g. a cross-store bulk metafield/price editor, or a multi-store analytics rollup). It exercises: agency surface, subscription + 7-day trial, one metered component, per-store billing via the Bridge, entitlement gating, and the relay — proving the whole Tool path the way Encore proved the App path.
