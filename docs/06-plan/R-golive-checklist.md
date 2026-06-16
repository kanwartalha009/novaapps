# Phase R — Go-Live Checklist

**Date:** 2026-06-15. One page. Pair with `R-golive-pilot-runbook.md` (how) and `../audits/GO-LIVE-AUDIT.md` (why).

## 1. Code + schema (done this session → verify green)
- [ ] `pnpm typecheck` green (api + all frontends).
- [ ] Platform migrated: `pnpm --filter @nova/database run migrate:dev -- --name r_attribution_billing_mirror` + `... run seed`.
- [ ] Encore migrated: `cd shopify/encore && npm run setup` (adds `NovaReferral`).

## 2. Secrets (P0-3 — blocker for any non-local deploy)
- [ ] `node scripts/generate-secrets.mjs --write` → move values into your secret manager; delete the file.
- [ ] SHARED secrets identical on **both** sides: `NOVA_INSTALL_CONFIRM_SECRET`, `NOVA_INGRESS_HMAC_SECRET` (Nova API .env **and** `shopify/encore/.env`).
- [ ] Replace every `change-me*` / literal key: `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `NOVA_*`, `SHOPIFY_BRIDGE_SECRET`.
- [ ] Rotate the seeded admin password (`SEED_ADMIN_PASSWORD` / change at first prod login).
- [ ] `NOVA_DEFAULT_AGENCY_SLUG` set (attribution fallback for no-ref/direct installs).

## 3. Attribution + billing (P0-1 — built; verify in the pilot)
- [ ] Install a dev store via the referral link `…/install?ref=<agencySlug>&shop=…` → store auto-provisioned under that agency.
- [ ] Subscribe (test charge) → exactly one SUBSCRIPTION `Charge` at the plan price → one PENDING `Commission` for the agency.
- [ ] Uninstall → install UNINSTALLED, `subscriptionStatus=CANCELLED`, no further charges ("accrual stopped").
- [ ] Agency rollup (`summaryForAgency`) matches.

## 4. Compliance (P0-2 — built; verify)
- [ ] Send a test `shop/redact` (Partner dashboard / CLI) → Store token purged, retained webhook payloads scrubbed.
- [ ] Confirm GDPR topics are no longer stored with raw payloads (`WebhookEvent.payload = { redacted: true }`).
- [ ] Encore's own GDPR handlers still respond 200 with valid HMAC (app-side data erasure — already built).

## 5. Authoritative earnings (fast-follow — before scaling past the pilot)
- [ ] Create Partner API client (View financials + Manage apps); set `SHOPIFY_PARTNER_ORG_ID/TOKEN`, `NOVA_SHOPIFY_APP_GID`.
- [ ] Dry-run `POST /v1/admin/charges/reconcile` (audit mode) → totals match the event-accrued ledger.
- [ ] Flip setting `billingSourceOfTruth = "partner"`. (`reconcileFromPartner` + `autoApproveMatured` already run in‑process every 6h — DEPLOY‑03 §9.)

## 6. Reliability + ops (P1/P2 — before public launch, not pilot)
- [x] Durable outbox + retry on the Encore→Nova send path (`NovaOutbox` + `/cron/nova-outbox`). **Built.**
  - [ ] Schedule it: `POST /cron/nova-outbox` every 1–2 min with `Authorization: Bearer $ENCORE_CRON_SECRET`.
  - [ ] Alert when `GET /cron/nova-outbox` reports `dead > 0` (delivery exhausted retries).
- [x] FAILED-event reprocessor — `webhooks.reprocessFailed` (+ admin endpoint), **auto‑scheduled in‑process every 15m** (`JobsModule`). **Built.**
- [x] Tests for the billing + signing paths — `vitest` + `billing.logic.spec.ts` / `nova-signature.spec.ts`. **Built** (run `pnpm install` then `pnpm --filter api test`).
- [x] CI gate — `.github/workflows/ci.yml` runs install → prisma generate → typecheck → test on push/PR. **Built.**
  - [ ] First: `pnpm install` locally to refresh `pnpm-lock.yaml` (now includes vitest), then commit it — CI uses `--frozen-lockfile`.
- [ ] Error tracking + alert on webhook FAILED rows / dead installs.
- [ ] Login rate-limiting + password reset.

**Pilot gate:** sections 1–4 ✅ → safe controlled launch on your own/known agency stores today.
**Public gate:** add 5 + 6.
