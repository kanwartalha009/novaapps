# Phase R — Go-Live Pilot Runbook (Encore)

**Date:** 2026-06-15
**Goal:** A controlled, real pilot where agency referrals attribute correctly and commissions accrue
end-to-end — with accrual that **stops the moment a merchant uninstalls or cancels** (no phantom
revenue). Scope: Encore only, test subscriptions first.

This runbook covers the code shipped this session. It closes the GO-LIVE-AUDIT P0-1 (commission path)
and the agency-tracking gap.

---

## What now happens end-to-end

```
Agency shares link:  https://<encore-url>/install?ref=<agencySlug>&shop=<merchant>.myshopify.com
        │
        ▼
/install  → stores NovaReferral{shop, ref}  → /app?shop=…  → Shopify OAuth
        │
        ▼  afterAuth
confirmInstall({ shopDomain, installedAt, ref })  ──► Nova /v1/internal/installations/confirm
        │                                                   │
        │                              auto-provisions Store{agencyId from ref} (immutable, I-8)
        │                              flips Installation → ACTIVE, attributes to the agency
        ▼
Merchant approves a plan → Shopify fires app_subscriptions/update (status only, NO amount)
        │
        ▼  Encore enriches with an AUTHORITATIVE Admin-API read (price/status/period)
forwardToIngress({ …payload, _nova:{ subscriptionId, status, amountMinor, currencyCode, currentPeriodEnd } })
        │
        ▼  Nova billing.recordFromWebhook
   • syncs the installation subscription mirror (status/period)
   • ACTIVE → records ONE Charge per cycle (externalId = subscriptionId:currentPeriodEnd)
   • not ACTIVE (CANCELLED/FROZEN/EXPIRED) → NO charge — accrual stops
        │
        ▼  CHARGE_RECORDED event
commissions.deriveFromCharge → Commission{ agencyId, amount, net of shopifyRevShareBps }
        │
        ▼
Agency balance = summaryForAgency(agencyId)  (rolls up every store the agency referred)
```

**Agency tracking answer:** agency A referring 5 stores = 5 `Installation` rows, each immutably
stamped `agencyId = A` at provision time. Every ACTIVE cycle on any of those 5 → one `Charge` →
one `Commission{ agencyId: A }`. `summaryForAgency(A)` sums all of it (pending/approved/paid).

**Uninstall safety:** `app/uninstalled` → `markUninstalled` flips the install UNINSTALLED and sets
`subscriptionStatus=CANCELLED`; any later subscription webhook with a non-ACTIVE status returns
"accrual stopped". Shopify auto-cancels the subscription on uninstall with **no further charges**, so
the ledger stops exactly where the money stops.

---

## Files changed this session

Platform (`apps/api`, `packages/database`):
- `installations.service.ts` — `ref` attribution + **auto-provision Store** under the referring agency (or `NOVA_DEFAULT_AGENCY_SLUG`); uninstall freezes billing.
- `billing.service.ts` — reads authoritative `_nova` amount/status/period; **per-cycle idempotency**; **ACTIVE-only** charge; net-basis `shopifyFeeBps`; subscription mirror; **`reconcileFromPartner`** (Partner-API authoritative true-up).
- `billing.controller.ts` — `POST /v1/admin/charges/reconcile`.
- `common/shopify-partner.ts` — Partner API client (authoritative earnings).
- `schema.prisma` — `Installation.subscriptionId/subscriptionStatus/currentPeriodEnd/lastChargeAt`.
- `seed.ts` — settings `shopifyRevShareBps`, `billingSourceOfTruth`.

Encore (`shopify/encore`):
- `routes/install.tsx` — referral landing (captures `?ref`).
- `lib/referral.server.ts` + `schema.prisma` `NovaReferral` — ref capture keyed by shop.
- `shopify.server.ts` — afterAuth consumes ref → `confirmInstall({ ref })`.
- `lib/nova.server.ts` — `confirmInstall` carries `ref`; `buildSubscriptionEnrichment` (Admin-API price/status/period).
- `routes/webhooks.app_subscriptions.update.tsx` — enriches the forwarded webhook with `_nova`.

---

## Run it (on the Mac)

### 1. Migrate + regenerate (platform)
```bash
cd "Nova Apps Platform"
pnpm --filter @nova/database run migrate:dev -- --name r_attribution_billing_mirror
pnpm --filter @nova/database run seed        # adds new settings + ensures the 'nova' default agency
pnpm typecheck
```

### 2. Encore schema (new NovaReferral + NovaOutbox models)
```bash
cd shopify/encore
npm run setup        # prisma generate + db push  (or: npx prisma db push)
npm run typecheck    # if defined; else: npx tsc --noEmit
```
Then schedule the durable-delivery retry (any HTTP scheduler / the platform cron):
`POST /cron/nova-outbox` every 1–2 min with `Authorization: Bearer $ENCORE_CRON_SECRET`.

### 3. Env (both sides must share the secrets)
Set real values (not the `change-me` placeholders) in the platform `.env` **and** Encore `.env`:
```
# platform
NOVA_INSTALL_CONFIRM_SECRET=<same-on-both>
NOVA_INGRESS_HMAC_SECRET=<same-on-both>
NOVA_DEFAULT_AGENCY_SLUG=nova
# encore
NOVA_API=https://<your-nova-api>/        # (no trailing /v1)
NOVA_INSTALL_CONFIRM_SECRET=<same-on-both>
NOVA_INGRESS_HMAC_SECRET=<same-on-both>
```

---

## Pilot test (test subscriptions — no real money)

1. **Seed an agency** to attribute to (or use `nova`). Note its `slug`.
2. **Install via the referral link** (this is the whole point — automatic attribution):
   `https://<encore-url>/install?ref=<agencySlug>&shop=<your-dev-store>.myshopify.com`
   → approve OAuth.
   - ✅ Check Nova: a `Store` exists for the dev shop with `agencyId = <agency>`, and an
     `Installation` is ACTIVE. (`GET /v1/admin/stores`, app-detail installs.)
3. **Subscribe to a plan** inside Encore (Shopify test charge). After approval:
   - ✅ Nova `GET /v1/admin/charges` shows one SUBSCRIPTION charge with the **plan price**.
   - ✅ `GET /v1/admin/commissions` (or agency summary) shows a PENDING commission for the agency.
4. **Re-send the same webhook** (or wait) → still exactly one charge (per-cycle idempotency).
5. **Uninstall the app** from the dev store:
   - ✅ Installation → UNINSTALLED, `subscriptionStatus=CANCELLED`.
   - ✅ Any further subscription webhook records **no** new charge ("accrual stopped").
6. **Agency rollup:** `summaryForAgency(<agency>)` totals match the charges above.

If all six pass, attribution + commission + stop-on-uninstall are correct end-to-end.

---

## Authoritative earnings (fast-follow, before scaling past the pilot)

The pilot accrues from the **plan price verified at ACTIVE** (`billingSourceOfTruth = "events"`). The
**authoritative** record of what Shopify actually paid is the **Partner API**. To switch:

1. Create a Partner API client (Partner Dashboard → Settings → Partner API clients) with
   **View financials** + **Manage apps**. Set `SHOPIFY_PARTNER_ORG_ID`, `SHOPIFY_PARTNER_API_TOKEN`,
   `NOVA_SHOPIFY_APP_GID`.
2. Verify field/version names in `common/shopify-partner.ts` against your Partner API version.
3. Dry-run: `POST /v1/admin/charges/reconcile` → returns an **audit** summary (no writes) while
   `billingSourceOfTruth = "events"`.
4. Flip setting `billingSourceOfTruth = "partner"` → the subscription webhook stops writing charges
   (mirror only) and `reconcileFromPartner` becomes the writer (net of real fees). Wire it to the
   nightly job next to `commissions.autoApproveMatured`.

Recurring earnings can lag up to ~37 days on Shopify's side, which is why commissions mature before
auto-approval (`commissionMaturityDays`).

---

## Still required before a *public* (non-pilot) launch — see GO-LIVE-AUDIT.md

- **GDPR handlers** on the platform (P0-2): `customers/redact`, `data_request`, `shop/redact` are
  forwarded but not yet processed; raw customer payloads are retained. Build before open install.
- **Secret rotation** (P0-3): replace every `change-me`/`admin12345`/literal key.
- **Durable outbox/retry** on the Encore→Nova send path + FAILED-event reprocessor (P1).
- **Tests + CI** for the billing/signing paths (P2).
