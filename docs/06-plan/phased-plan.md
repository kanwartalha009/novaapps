# Phased Delivery Plan (v2 — post-overhaul)

Improvements **first**, then the new architecture, built in dependency order. Each phase ships deployable, testable value, ends on a verified gate **and** a green post-phase audit (`07-quality/audit-mechanism.md`), and never reopens a frozen contract (that's a CHANGE-CONTROL event). Supersedes the v1 plan + `process/roadmap-to-real.md` (R0–R4 fold into P1–P2 below).

> Context: the platform is a Phase-1 **fixtures prototype** — only `auth` + `agency-signup` are implemented, every other service is a stub, **no migration has run**. So we are adding architecture to a prototype, which is the cheapest possible moment to fix invariants and land the v2 data model.

| Phase | Theme | Depends on |
|---|---|---|
| **P1** | Correctness fixes + first migration + App distribution (was R0/R1) | — |
| **P2** | App money path + App Shell cleanup + Encore green (was R2/R3) | P1 |
| **P3** | Tools foundation: registry + Availability + entitlements (GRANT-only) | P1 |
| **P4** | Tool Shell + tool-engine + reference tool | P3 |
| **P5** | Store Bridge | P4 |
| **P6** | Inbound billing (Stripe): subscriptions + metering + full entitlements | P3 (P5 for per-store) |
| **P7** | Creation skills + Platform Capability Manifest + seeder integration | P3 |
| **P8** | Hardening & scale | all |

---

## P1 — Correctness fixes, first migration, App distribution
**Improvements first (mostly spec-level, applied in this overhaul):** I-3 reword (F1), I-6 amend, six-surface reconciliation (F2), `billing` naming (F4), `engine.md` split (F5), webhook `source` discriminator (F6), pin `commissionBasis` (F10), typed `Setting` + `AuditLog` (F8).
**Schema (was R0):** generate the **first platform migration** — and because no migration exists yet, land the **v2 model additions in the same pass** (Tool/ToolPlan, Subscription/Invoice, Meter/UsageRecord, StoreBridgeConnection/ToolActivation, Availability/AvailabilityEntry, Entitlement, AuditLog, `commissionModel`/`flatAmount`, `WebhookEvent.source/productType/productSlug`, `Agency.stripeCustomerId`, `Store.grantedScopes`). One migration, no churn later.
**Build (was R1):** apps-registry CRUD + encrypted creds + publish; stores connect; **installations confirm** + **webhook ingress** to the integration contract; replace App fixtures with API.
**Exit:** `prisma migrate` clean on a real DB; a published app appears in the agency catalog and installs on a dev store; a forwarded event lands in ingress. **Audit:** invariant audit passes with reworded I-3/I-6; spec-vs-code drift = 0 for these modules.

## P2 — App money path + App Shell cleanup + Encore green
**Build (was R2):** `billing` charge ledger from `app_subscriptions/update` + one-time; `commissions` auto-calc with **PERCENT + FLAT** (ADR-012), maturity window, approve/adjust, reversal; admin/agency dashboards; nightly reconciliation; CSV statements.
**Build (was R3):** `engine` app-creation automation; **re-spec `app-admin` as the App Shell** — drop the legacy subdomain-host/per-app-DB-in-monorepo UX (F3), orchestrate standalone repos.
**Exit:** a test charge → correct PENDING→APPROVED commission on both dashboards; wizard-created app reaches a dev store via CI; **Encore end-to-end green** (its blocked Phase-0 gate items pass with no app-side change). **Audit:** money reconciliation harness green; commission property tests pass.

## P3 — Tools foundation (access before money)
**Build:** `tools-registry` (Tool/ToolPlan, no Stripe yet); **unified `Availability`** (migrate existing `AgencyApp` → PRIVATE ALLOW; narrow `AgencyApp` to commission-override); `ToolActivation`; `entitlements` resolver with the **GRANT-only** path (admin comp). Admin Shell: Tools pillar + availability matrix + grant. Agency surface: `/tools` catalog + granted tool appears active.
**Exit:** an `AGENCY`-type tool can be registered, made available, **granted** to an agency, and gated by a server-side entitlement check — **with no billing and no store access**. Proves the access spine. **Audit:** entitlement decision tests (grant/none) pass; availability resolves PRIVATE/PUBLIC correctly.

## P4 — Tool Shell + tool-engine + reference tool
**Build:** `apps/tool-admin` surface; `tool-engine` (scaffold `nova-tool-template`, per-tool DB, CI callback, build-pack export); build the **reference Tool** (agency-facing, Bridge off for now) on the standalone-repo model.
**Exit:** a tool created from the Tool Shell runs as its own repo+DB, checks entitlements server-side, and is usable by a granted agency. **Audit:** generated tool passes the integration-contract conformance test.

## P5 — Store Bridge
**Build:** the Nova Store Bridge OAuth app; per-store offline-token broker (harden `Store`, F9); scoped/audited/rate-limited **GraphQL Admin proxy**; `StoreBridgeConnection`; webhook **relay** (`source=STORE_BRIDGE`); revoke = immediate kill. Wire the reference tool's store features.
**Exit:** the reference tool reads/writes a real dev store **only** through the Bridge; revoke cuts access; every call audited. **Audit:** Store Bridge security suite (scope enforcement, token-never-leaks, revoke completeness, rate-limit) green.

## P6 — Inbound billing (Stripe)
**Build:** `subscriptions` (Stripe customer per agency, 7-day trial → premium, lifecycle via verified webhooks, Invoice mirror); `metering` (Meters + meter events, per-store meter on active bridge connections); **full `entitlements`** (GRANT + SUBSCRIPTION + TRIAL + FREEMIUM + quota); agency **projected-spend** view + self-serve subscribe.
**Exit:** an agency self-serve subscribes, runs a 7-day trial, is metered, billed per-store, and sees projected spend before the invoice; entitlement flips correctly on `past_due`/cancel. **Audit:** metering↔Stripe reconciliation = 0 drift; no double-billing (idempotency tests); I-14 separation verified.

## P7 — Creation skills + capability manifest
**Build:** the **Platform Capability Manifest v1** (versioned, machine-readable: module taxonomy, plan shapes, store-bridge scopes, billing models); finalize the three skills (`nova-validator-app`, `nova-validator-tool`, `nova-spec-ingestor`) against it; wire the ingestor's **seeder output** to real registry create endpoints.
**Exit:** idea → validator → Nova spec → ingestor → registry rows + a phased build doc, with the validator's platform-fit check reading the manifest. **Audit:** round-trip test (validator spec == ingestor input == registry schema).
> The skills ship **now** (this overhaul, `09-skills/`) for ideation; P7 is the manifest + seeder automation that lets the ingestor write straight to the registry.

## P8 — Hardening & scale
PayoutProviders (Stripe Connect, then PayPal); `AuditLog` coverage everywhere privileged; rate limiting; **BullMQ** for ingress + usage if volume demands (ADR); e2e suite; observability (Sentry, structured logs); per-tenant custom domains; password reset + 2FA.

---

## Dependency rule
Phase N may depend only on contracts frozen in phases < N. Anything that changes a frozen contract goes through `CHANGE-CONTROL.md`. Each phase's **exit gate** is verified from real code/platform evidence; the **post-phase audit** must be green before the next phase starts.
