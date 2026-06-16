# Surface: Agency surface

**Runtime:** `apps/agency` (Next.js · :3002 · `[agency-slug].<domain>`). **Audience:** `agency` JWT; middleware resolves subdomain → `/t/[slug]`; API re-verifies tenant (I-9). **Role:** where an agency *consumes* the marketplace — connecting stores, installing **Apps** (to earn), and activating **Tools** (to pay/be comped).

## Routes (within tenant)

```
/dashboard          net position: earnings (commissions) − spend (tools), recent activity
/stores             connect/manage Shopify stores (+ Store Bridge authorizations)
/apps               app catalog (availability-filtered) → install on a store
/apps/[appSlug]     app detail, plans, installs
/installations      installs across stores, status, plan overrides
/commissions        earnings ledger, statements (EARN — money in)
/payouts            payout batches + payout methods (money received)
/tools              tool catalog (availability-filtered): activate via subscribe/trial  (v2)
/tools/[toolSlug]   tool detail, plan, trial CTA, projected spend                        (v2)
/subscriptions      active tool subscriptions, invoices, usage + projected spend (SPEND — money out)  (v2)
/team               members + invites
/support            app/tool-scoped issues
/settings           agency profile, billing (Stripe), payout settings
```

## The two relationships, side by side

| | **Apps** (earn) | **Tools** (pay) |
|---|---|---|
| Catalog filter | `Availability` (PRIVATE allow / PUBLIC minus denylist) | same |
| Action | **Install** on a store (referral locked, I-8) | **Activate**: start **7-day trial → subscribe**, or use an **admin GRANT** |
| Money | commissions accrue → payouts | subscription + metered + per-store invoices (Stripe) |
| Gating | install status | **entitlement** (access + remaining quota, I-12) shown inline |

## Spend transparency (required, not optional)
Because tools cost the agency money, every tool surface shows **projected spend for the current period** (base + metered-so-far + per-store × active bridge connections) **before** the Stripe invoice closes. `/subscriptions` aggregates this. This is a churn-control requirement, not a nicety (`money-flows.md`).

## Activation flows (Tools)
```
Self-serve:  /tools/[slug] → Start trial (TRIALING 7d) → Subscribe (Stripe Checkout) → ACTIVE
Admin grant: Admin Shell GRANT → tool appears Active (comped) with no Stripe object
Both resolve to an Entitlement; backends check it server-side (I-12).
Store-facing tools also require: /stores → Authorize Store Bridge for the store(s) the tool will touch.
```

## Endpoints (consumed)
```
GET /catalog/apps, /catalog/tools                     (agency aud — availability-filtered)   (tools v2)
POST /agency/installations  (install handoff)
POST /agency/tools/:id/subscribe | /trial             (→ Stripe)                              (v2)
GET  /agency/subscriptions, /usage, /invoices                                                  (v2)
GET  /agency/entitlements/:toolId                      (access + quota for UI hints)           (v2)
POST /agency/stores/:id/bridge/authorize               (Store Bridge OAuth)                    (v2)
GET  /agency/commissions, /payouts (+ methods)
```
