# Nova Apps Platform — Go-Live Audit

**Date:** 2026-06-15
**Scope:** Whole platform + Encore app↔Nova integration. Question asked: *"are we wired correctly, what anomalies exist, what's missing to go live?"*
**Method:** Source read of the sending side (Encore `app/lib/nova.server.ts`, `shopify.server.ts`, webhook routes), the receiving side (`installations.internal.controller`, `webhooks.controller/service`, `billing.service`), the signing contract, Prisma schema, shared DTOs, seed, env, and repo-wide checks (tests/CI/secrets).

---

## TL;DR verdict

**The transport is wired correctly. The money is not.**

The app→platform *plumbing* — signing, secrets, endpoints, headers, install-confirm trigger, webhook forwarding, idempotency — matches the contract exactly and is verified end-to-end. **But with a real install today, the platform would record $0 charges and generate $0 commissions.** The App-revenue → commission path does not close. That, plus an unprocessed-GDPR exposure and placeholder secrets, are the three things that block go-live.

| # | Finding | Severity | Type |
|---|---------|----------|------|
| 1 | App revenue → commission does not close (no per-cycle charge signal; webhook has no amount; install sends no plan; stable-GID dedupe) | **P0 — blocker** | Correctness / money |
| 2 | GDPR `redact`/`data_request` forwarded but never processed by the platform; customer PII persisted forever in `WebhookEvent.payload` | **P0 — blocker** | Legal / compliance |
| 3 | All shared secrets + admin password are dev placeholders (`change-me`, `admin12345`) | **P0 — blocker** | Security |
| 4 | App→Nova send path has no durable outbox/retry — failures are logged and dropped | **P1** | Reliability / money |
| 5 | `install-confirm` omits `planName` → `Installation.appPlanId` never set → plan-based billing/metering/entitlement resolution all run blind | **P1** | Correctness |
| 6 | Webhook ingestion is synchronous/in-process; a transient error marks `FAILED` with no retry/DLQ | **P1** | Reliability |
| 7 | `shopifyFeeBps` hardcoded `null` → commissions accrue on gross, not Shopify-net (over-pays agencies) | **P1** | Money |
| 8 | Zero automated tests; no CI gate | **P2** | Quality |
| 9 | No observability/alerting (errors, webhook failures, dead installs are invisible) | **P2** | Operability |
| 10 | Auth hardening deferred: no rate-limit/lockout, password reset, or 2FA | **P2** | Security |

---

## The core question: is the app sending information to Nova correctly?

**Yes for transport/lifecycle. No for billing data.** Detail below.

### What is verified correct ✅

- **Signing.** `nova.server.ts` signs `X-Nova-Signature: sha256=<hex HMAC-SHA256(rawBody, secret)>` and the platform verifies the same over `req.rawBody` with constant-time compare → 401 on mismatch. Install-confirm uses `NOVA_INSTALL_CONFIRM_SECRET`; ingress uses `NOVA_INGRESS_HMAC_SECRET`. Sending and receiving secrets match per endpoint. **Exact contract match.**
- **Install-confirm fires.** `shopify.server.ts` `afterAuth` → `confirmInstall({ shopDomain, installedAt })` → `POST /v1/internal/installations/confirm`. The platform controller verifies + flips the `Installation` to ACTIVE and locks referral. Endpoint, body shape, and `appSlug:"encore"` all match.
- **Lifecycle + GDPR forwarded.** `app/uninstalled`, `app_subscriptions/update`, `customers/data_request`, `customers/redact`, `shop/redact` are all forwarded signed to `POST /v1/webhooks/shopify/encore` with `X-Nova-Topic` / `X-Nova-Shop-Domain` / `X-Shopify-Webhook-Id`.
- **Idempotency at the door.** Platform dedupes `WebhookEvent` on `externalId = X-Shopify-Webhook-Id`; uninstall routes to `installations.markUninstalled`.
- **Resilient by design.** If `NOVA_API` is unset the app no-ops; network errors never throw, so Shopify webhook handlers still 200. (Good for app stability — but see Finding 4 for the flip side.)
- **Schema/DTO/seed are consistent.** The earlier-suspected `AppPlan` drift is a non-issue: `annualAmount`, `preorderLimit`, `notifyLimit` exist on the Prisma model, the `upsertAppPlanSchema` DTO, and the seed. No anomaly.

### Where it breaks ❌ — see Finding 1.

---

## P0 — Blockers

### Finding 1 — App revenue → commission does not close (no money is ever recorded)

Trace a real Encore subscription through the system:

1. Merchant approves the **Basic (Monthly)** plan. Shopify fires `app_subscriptions/update` with
   `{ app_subscription: { admin_graphql_api_id, name:"Encore — Basic (Monthly)", status:"ACTIVE", current_period_end } }`.
   **There is no amount/price field in this payload** (`webhooks.app_subscriptions.update.tsx` typing confirms it).
2. Encore forwards it to the ingress. Platform `webhooks.service.ingest` routes non-uninstall topics to `billing.recordFromWebhook`.
3. `billing.service.recordFromWebhook`:
   - `extractAmount()` looks for `payload.amount / price / app_subscription.amount / line_items[…]` → **all absent → `null`.**
   - Fallback: `if (amount == null && type === "SUBSCRIPTION") amount = installation.appPlan?.amount`. But the install was confirmed **without a plan** (Finding 5), so `installation.appPlanId` is null → `appPlan` is null → **amount stays null**.
   - `if (amount == null) return { recorded: false, reason: "no billable amount in payload" }`. **No `Charge` row → no `CHARGE_RECORDED` event → no commission.**

On top of that, two deeper problems:

- **No per-cycle revenue signal exists.** `app_subscriptions/update` is a *status-change* event, not a *charge* event — Shopify does **not** send a webhook for each recurring monthly charge. So even with amount extraction fixed, the platform never learns that month 2, 3, 4… were charged.
- **Stable-GID idempotency.** For this payload `externalId = app_subscription.admin_graphql_api_id` (the subscription GID, stable across cycles). The per-cycle key `${sub.id}:${current_period_end}` is dead code because the GID branch wins → at most **one** charge would ever record per subscription.

**Net: zero charges, zero commissions from real installs.** The lifecycle path (ACTIVE/uninstall) works; the revenue path is non-functional.

**Recommended fix (design, not a one-liner):** Make the **Shopify Partner API financial-transactions/payouts feed** the source of truth for App revenue — it is the only authoritative record of what Shopify actually charged and paid, and it also yields the real revenue-share fee for Finding 7. Interim option if Partner API is out of scope for v1: on `app_subscriptions/update → ACTIVE`, (a) pass `planName` on install-confirm so `installation.appPlan` resolves, (b) accrue the plan price on a 30-day scheduled job with a genuine per-cycle idempotency key (`subscriptionId:periodStart`), and (c) reconcile against Partner payouts later. Either way this is a **required feature, not a bug fix**, before the Apps track can earn.

### Finding 2 — GDPR requests are forwarded but never honored by the platform; PII retained indefinitely

`webhooks.service.ingest` only special-cases `app/uninstalled`; everything else (including `customers/redact`, `customers/data_request`, `shop/redact`) goes to `billing.recordFromWebhook`, where `typeForTopic` returns `null` → "not a billing topic" → the event is stored and marked PROCESSED, **but no data is redacted or exported.** Worse, the full Shopify payload — which for these topics contains **customer PII (ids, emails, order history)** — is persisted in `WebhookEvent.payload` (`webhooks.service.ts` line 50) with no retention/redaction. The Encore app purges its *own* data correctly; the **platform** does not honor the request for platform-held data and actively retains the PII it was asked to delete. This is an App-Store-policy and GDPR exposure. **Fix:** add explicit handlers for the three GDPR topics (redact store/customer rows + scrub the stored payloads), and stop persisting raw customer payloads (or auto-expire them).

### Finding 3 — Secrets are development placeholders

`.env.example` ships `JWT_SECRET="change-me-…"`, `NOVA_INSTALL_CONFIRM_SECRET / NOVA_INGRESS_HMAC_SECRET / NOVA_ENTITLEMENT_SECRET / NOVA_BRIDGE_SECRET = "change-me-…"`, `APP_ENCRYPTION_KEY="32-byte-hex-key-…"` (literal), and `SEED_ADMIN_PASSWORD="admin12345"`; the seed also hardcodes Encore's `shopifyApiKey`. None can reach production. **Fix:** generate strong unique secrets, store them in a real secret manager (not `.env` in the repo), rotate the committed Encore key, and force-change the admin password on first prod boot.

---

## P1 — High (fix before scaling installs)

- **Finding 4 — No durable outbox/retry on app→Nova.** `nova.server.ts` swallows failures (`console.error`, no throw). A transient outage during `confirmInstall` or a billing/lifecycle forward = **silent permanent loss** — an install never goes ACTIVE, or revenue/uninstall is never seen. The file's own TODO flags this for "phase4." Add a persisted outbox + retry with backoff and a replay tool.
- **Finding 5 — install-confirm omits `planName`.** `afterAuth` sends only `{ shopDomain, installedAt }`, so `Installation.appPlanId` is never populated. This blinds the billing fallback (Finding 1), plan-based metering caps, and any plan-aware entitlement logic. Send the selected plan on confirm (and update it on plan change).
- **Finding 6 — Synchronous in-process webhook handling.** `ingest` does the work inline; on a transient DB error it sets `status:"FAILED"` and there is no retry/DLQ/reprocessor. Move processing to a queue (or add a FAILED-row sweeper) so events are durably retried.
- **Finding 7 — Shopify fee not captured.** `billing.service` writes `shopifyFeeBps: null` ("treated as 0 fee"). Commissions therefore accrue on **gross**, over-paying agencies versus Shopify-net payouts. Capture the real fee (Partner API) before computing commissions — ties into Finding 1.

---

## P2 — Should-have around launch

- **Finding 8 — No tests, no CI.** Zero `*.spec.ts`/`*.test.ts`; no `.github/workflows`. The money and signing paths above are exactly what regression tests should pin. Add unit tests for `recordFromWebhook` / signature verify / entitlement resolver and a CI gate (typecheck + build + test).
- **Finding 9 — No observability.** No error tracking, structured logs, or alerting on webhook FAILED rows, dead installs, or commission anomalies. Add Sentry-or-equivalent + a webhook-failure alert.
- **Finding 10 — Auth hardening.** Rate-limiting/lockout, password reset, and 2FA are deferred. Add at least login rate-limiting + reset before opening admin/agency access widely.
- **Housekeeping.** Sweep hardcoded dev URLs noted across the Encore work; confirm a clean baseline `tsc` for the Encore app (PrismaSessionStorage typing) before store submission.

---

## Recommended go-live punch list (in order)

1. **Design + build App revenue recognition** (Partner API transactions/payouts → `Charge` ledger; capture fee). *(Findings 1, 7)*
2. **Pass plan on install-confirm** + populate `Installation.appPlan`. *(Finding 5)*
3. **Implement the three GDPR handlers** + stop retaining raw customer payloads. *(Finding 2)*
4. **Rotate every secret**, move to a secret manager, force admin password change. *(Finding 3)*
5. **Durable outbox + retry** on the app→Nova send path; **FAILED-event reprocessor** on the platform. *(Findings 4, 6)*
6. **Tests for the money + signing paths**, wire a CI gate. *(Finding 8)*
7. **Observability + webhook-failure alerting.** *(Finding 9)*
8. **Auth hardening** (rate-limit, reset, 2FA). *(Finding 10)*

Items 1–4 are true go-live blockers (money correctness, legal, security). 5–8 are required to operate safely at any real install volume.

---

## Appendix — evidence map

| Claim | Source |
|-------|--------|
| Signing + endpoints + secrets match | `shopify/encore/app/lib/nova.server.ts`; `apps/api/.../installations.internal.controller.ts`; `apps/api/.../webhooks.controller.ts`; `NOVA-INTEGRATION-CONTRACT.md` |
| install-confirm fires on auth, no plan | `shopify/encore/app/shopify.server.ts` (`afterAuth`) |
| Subscription webhook has no amount | `shopify/encore/app/routes/webhooks.app_subscriptions.update.tsx` |
| Amount extraction + plan fallback + abort | `apps/api/.../billing/billing.service.ts` `extractAmount` / `recordFromWebhook` (l.54–108) |
| Stable-GID idempotency | `billing.service.ts` `externalId` (l.80–86) |
| GDPR topics not handled; payload retained | `apps/api/.../webhooks/webhooks.service.ts` `ingest` (l.55–68, payload l.50) |
| Placeholder secrets | root `.env.example`; `packages/database/prisma/seed.ts` |
| No tests / no CI | repo scan: 0 `*.spec.ts`/`*.test.ts`, no `.github/workflows` |
| Schema/DTO/seed consistent (no drift) | `schema.prisma` `AppPlan` (l.193–205); `packages/shared/src/schemas/app.ts`; `seed.ts` |
