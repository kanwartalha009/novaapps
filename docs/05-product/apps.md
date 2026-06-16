# Product class: Apps

A Shopify App Store app installed on merchant stores. **Merchant pays via Shopify Billing; the referring agency earns commission.** Standalone repo + own DB; platform holds metadata + credentials. Reference implementation: **Encore** (`shopify/encore`).

## Lifecycle (Admin Shell → App Shell → Agency surface)

```
1 REGISTER  (Admin Shell)   App row, class=APP fixed (I-11), plans, encrypted Shopify creds, status DRAFT
2 BUILD     (App Shell)      blueprint spec → engine create (standalone repo + client_id) → build-pack → implement phase by phase
3 PUBLISH   (App Shell)      publish checklist (distribution irreversible, billing test, GDPR, listing, review) → PUBLISHED
4 AVAILABLE (Admin Shell)    Availability policy: PRIVATE allowlist | PUBLIC denylist (ADR-011)
5 INSTALL   (Agency surface) agency connects store → installs → referral agencyId locked (I-8)
6 EARN      (platform)       Shopify charges → billing.Charge → commissions.Commission → payouts.Payout
```

## Licensing (commission — money to the agency)
- Model: **PERCENT (bps) or FLAT** (ADR-012), resolved assignment → agency → platform default, snapshotted per commission.
- Basis: net or gross of Shopify fee (`Setting.commissionBasis`, default NET per ADR-004 + seed).
- Per-store comp/discount via `Installation.planOverride` (FREE/PERCENT/FIXED) — applied by the app at billing; never touches the referral `agencyId`.

## Availability
Unified `Availability` (ADR-011). `PUBLISHED` = offerable; availability decides which agencies see it; `DELISTED` hides from catalogs while existing installs keep working. Redacting an agency's access is gated on that agency having **no ACTIVE installations**.

## Data plane
Shopify OAuth gained at install (token-exchange, embedded), webhooks (lifecycle + GDPR three + billing) forwarded to platform ingress **Nova-signed** (`X-Nova-Signature`) per the integration contract. The App's own OAuth token is **distinct** from any Store Bridge token (G3b).

## Build mechanics (the runbook, `process/`)
Spec-first blueprint → `engine` scaffolds `nova-app-template` (React Router + Nova wiring) → per-app Postgres + Prisma migrations → install-confirm + webhook forwarding → publish. Module taxonomy: backend (App Home) · admin-ui · storefront-widget · checkout (Plus-flagged) · function-* · pixel · customer-account · flow · pos.

## Reference: Encore
Standalone repo, React Router/Polaris, own Prisma schema (Postgres in prod; dev SQLite is dev-only, F11), Partner app + `client_id` captured, sending side of the integration contract implemented. Blocked only on the platform receiving endpoints (R1) — not on Encore. Encore is the canonical worked example for every step above.
