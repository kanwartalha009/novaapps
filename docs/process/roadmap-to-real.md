# Roadmap — making the process real

> **Superseded (2026-06-14) by `docs/06-plan/phased-plan.md`.** R0–R4 below fold into P1–P2 of the v2 plan (the architecture overhaul added Tools, inbound billing, the Store Bridge, and the shells). Kept for history and because the R1 contract detail (install-confirm + ingress) is still accurate. Use the v2 phased plan as the live sequence.

> The platform is a **Phase-1 fixtures prototype**: only auth + agency-signup are implemented; every
> other API service is an 8-line stub, the 4 frontends render `FX_*` mock data, and there are no DB
> migrations. This sequences the work to make the v1 process (`README.md`) execute for real. It builds
> on `docs/06-plan/phased-plan.md` — same phases, concrete next moves.

| Step | = phased-plan | Unlocks | Scope |
|---|---|---|---|
| **R0 — Platform migration** | Phase 0 fix | Real DB | Commit + run the initial migration for `packages/database` (21 models). Today none exist despite README/Phase-0 claiming "schema migrates." |
| **R1 — Catalog & distribution** | Phase 2 | **App e2e (Stage 4)** | apps-registry CRUD + encrypted credentials + publish; stores connect; **installations confirm** (`POST /internal/installations/confirm` → ACTIVE) and **webhook ingress** (`POST /webhooks/shopify/:slug`, HMAC per `NOVA-INTEGRATION-CONTRACT.md`, idempotent, GDPR). Replace fixtures with API. **This is what unblocks Encore.** |
| **R2 — Money read-path** | Phase 3 | Commissions | Billing ledger from `app_subscriptions/update` + one-time; auto-calc commissions (maturity, approve/adjust, reversal). |
| **R3 — Engine** | Phase E | Auto Stage 2–3 | Wizard → repo from `nova-app-template`, generate `shopify.app.toml`, headless `app init`/`deploy` (CI token), capture `client_id`, write the registry row + module manifest. Removes the manual scaffold. |
| **R4 — Payouts + hardening** | Phase 4–5 | Publish at scale | Payout providers; publish-checklist automation; observability; e2e tests. |

## The Nova contract is the linchpin
R1's `installations` + `webhooks` controllers are today `_status` placeholders. Build them to
**`shopify/encore/NOVA-INTEGRATION-CONTRACT.md`** (header `X-Nova-Signature: sha256=<hex>`, secrets
`NOVA_INSTALL_CONFIRM_SECRET` / `NOVA_INGRESS_HMAC_SECRET`). Then reconcile `docs/03-modules/webhooks.md`
+ `installations.md` to that scheme (C2). Once R1 ships, re-run Encore Phase 0's blocked gate items
(Installation ACTIVE; event in ingress log) — they should pass with no app-side change.

## Next 3 moves
1. **R0**: `cd packages/database && npx prisma migrate dev --name init` (on a machine with Postgres),
   commit the migration. (Sandbox can't — macOS-built node_modules + no DB.)
2. **R1 / installations**: implement `POST /internal/installations/confirm` (verify `X-Nova-Signature`
   with `NOVA_INSTALL_CONFIRM_SECRET` → upsert Installation ACTIVE, lock `agencyId`). Swap the admin/agency
   install views off fixtures.
3. **R1 / webhooks**: implement `POST /webhooks/shopify/:appSlug` (verify signature → store `WebhookEvent`
   by `X-Shopify-Webhook-Id`, 200, async route by `X-Nova-Topic`). Then verify against Encore end-to-end.
