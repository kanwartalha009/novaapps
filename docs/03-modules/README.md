# Backend modules

One spec per `apps/api` module = the unit of change (C1). Modules talk through service interfaces, never each other's tables (I-4). A module may depend only on modules above it in the graph.

## Modules by area

| Area | Modules |
|---|---|
| Identity & access | `auth`, `users-rbac` |
| Tenancy | `agencies` |
| App catalog & distribution | `apps-registry`, `stores`, `installations`, `engine` |
| App money (inbound Shopify → outbound agency) | `billing`, `commissions`, `payouts` |
| **Tool catalog & distribution** (v2) | `tools-registry`, `tool-engine`, `store-bridge` |
| **Tool money (inbound agency, Stripe)** (v2) | `subscriptions`, `metering` |
| **Licensing/access** (v2) | `availability` (offerability), `entitlements` (usability + quota) — ADR-011 |
| Ingress & ops | `webhooks` (all sources), `support`, settings/audit |

## Dependency graph (v2; acyclic)

```
auth ──► users ──► rbac
agencies ──► users
apps-registry ──► (none)        tools-registry ──► (none)
stores ──► agencies
store-bridge ──► stores, tools-registry
installations ──► apps-registry, stores, agencies
webhooks ──► installations, billing, store-bridge        (ingress only; SHOPIFY_APP|STRIPE|STORE_BRIDGE)
billing ──► installations
commissions ──► billing, agencies                        (PERCENT|FLAT, ADR-012)
payouts ──► commissions, agencies                        (outbound, PayoutProvider)
subscriptions ──► tools-registry, agencies               (inbound Stripe)
metering ──► subscriptions, store-bridge                 (usage → Stripe Meters)
availability ──► apps-registry, tools-registry           (offerability policy; consumed by catalogs)
entitlements ──► subscriptions, tools-registry, agencies (reads metering; access authority)
engine ──► apps-registry          tool-engine ──► tools-registry
support ──► apps-registry, installations
```

## Money invariant at a glance (I-14)
Two ledgers, never mixed: **App** = `billing`→`commissions`→`payouts` (agency earns); **Tool** = `subscriptions`+`metering`+invoices (agency pays). They meet only in reporting (`money-flows.md`).
