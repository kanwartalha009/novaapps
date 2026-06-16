# Product classes

Two classes share one skeleton (registry row + standalone repo + own DB + builder shell + availability) and differ on four switches (reach, data plane, payer, agency-money). See `01-architecture/decisions/ADR-007`.

| | `apps.md` | `tools.md` |
|---|---|---|
| Monetization | merchant pays (Shopify Billing) → agency **earns** commission | agency **pays** Nova (Stripe): freemium/premium/metered/per-store |
| Data plane | Shopify install OAuth + webhooks | Store Bridge (optional) |
| Reference | **Encore** (built) | *to build* |

These specs are the end-to-end "how a class works": lifecycle, licensing, availability, and the runbook hook into `process/`.
