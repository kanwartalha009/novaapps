# Architecture Overhaul — Audit & Findings (2026-06-14)

> Scope: (1) audit the proposed **three-shell + Tools** architecture and the **validator/ingestor** creation skills; (2) audit the **current Nova platform** and the **Encore** Shopify app; (3) flag everything worth fixing, even minor. The target architecture, ADRs, rebased specs, phased plan, quality framework, and skills produced from this audit live in the rest of `docs/` (see "Where this lands" at the end).
>
> **Change class of the overhaul as a whole: C3 (architecture).** It amends frozen invariants (notably I-3 and I-6) and adds a second product class. Per `CHANGE-CONTROL.md`, that requires an impact report + ADRs + explicit approval before code — this document is that impact report; the ADRs are `01-architecture/decisions/ADR-007..012`.

---

## 0. Verdict

The proposed model is **sound and largely already latent in the codebase**. "App Shell = `app-admin`," per-product databases, `AgencyApp` availability, the engine, and the standalone-repo runbook are all here today. The overhaul's real weight is **one genuinely new thing: a second product class (Tools) whose money flows the opposite direction from Apps.** Apps pay the platform/agency via Shopify; Tools are paid *by* the agency to the platform. That single fact ripples into billing, licensing, the data plane (Store Bridge), a new shell, and RBAC.

Recommendation: adopt the model with **six refinements** (§3). Build it in the phased order in `06-plan/phased-plan.md`, which front-loads the cheap correctness fixes (§4 flags) before the new surfaces.

---

## 1. Audit of the proposed structure

### 1.1 What's strong (keep as-is)

- **The shell triad is the right decomposition.** Admin Shell (governance) over App Shell and Tool Shell (per-product build/backend consoles) cleanly separates *who governs the marketplace* from *who builds a unit of inventory*. It mirrors the proven `admin` ⟶ `app-admin` split that already exists.
- **Symmetry between Apps and Tools** (each: a registry row in the platform, a standalone repo, its own database, its own builder shell, agency availability) keeps the mental model and the codebase regular. Tools are "Apps that the agency pays for and that reach stores through a bridge instead of an install."
- **Two creation skills + one ingestor** is the right shape: validation (idea + platform-fit + pricing + risk) is a different job from scaffolding (seeders + doc structure + phased plan), and app-vs-tool validation diverge enough (billing model, data plane, availability semantics) to justify separate validators sharing a common core.
- **"Spec document is the output of validation and the input to ingestion"** matches the existing 5-stage runbook (`process/README.md`) and the Encore build-pack precedent. The skills formalize Stage 1.

### 1.2 Gaps in the proposal (must be resolved before build)

| # | Gap | Why it matters | Resolution (where) |
|---|---|---|---|
| G1 | **Tool billing direction is undefined as a system.** "Freemium + premium, 7-day trial, metered, per-store" describes the *plan*, not the *money plumbing*. The platform today has no inbound payment path — `Charge`→`Commission`→`Payout` is outbound to agencies only. | This is the crux of the overhaul. Without an inbound billing module the agency can't actually pay. | ADR-008 + `03-modules/subscriptions.md` + `metering.md` (Stripe) |
| G2 | **"Store Bridge" is named but not specified.** How a Tool authenticates to a store, gets/refreshes tokens, manages many stores per agency, relays webhooks, and is rate-limited is unspecified. | Tools are useless without store data; this is also the largest security blast radius in the system (one agency's credentials for many stores, reused by tool code). | ADR-009 + `03-modules/store-bridge.md` |
| G3 | **"Hybrid" tool type is underdefined.** Agency-use vs store-use vs hybrid changes auth, billing (per-seat vs per-store), and the surface a tool renders in. "Hybrid" needs explicit rules, not a third enum value. | Ambiguity here leaks into billing and entitlement logic. | `05-product/tools.md` §"Tool types" |
| G3b | **Apps↔Tools composition is undefined.** Can a Tool act on a store that also has one of your Apps installed? Can they share the Store Bridge token vs the app's own OAuth token? | Determines whether Store Bridge and app installs are one credential store or two. | `03-modules/store-bridge.md` §"Relationship to installations" |
| G4 | **Entitlement enforcement is implied, not owned.** "Gated by licensing," "trial," "metered caps," "freemium limits," "activate under tools" all require a runtime authority that answers *"can this agency use this tool right now, and how much is left?"* No module owns that. | Trial expiry, metered ceilings, and admin grants vs paid subscriptions must resolve in one place or they'll drift. | ADR-011 + `03-modules/entitlements.md` |
| G5 | **Availability semantics are only half-built.** Today availability = explicit `AgencyApp` opt-in. The proposal adds "make available to all and exclude some" — a *public-with-denylist* mode that the current model can't express. | Needed for both apps and tools; cheap to unify now, painful later. | ADR-011 + domain `Availability` |
| G6 | **Commission model is percentage-only.** You asked for "flat and percentage." `Agency.commissionRateBps` / `AgencyApp.rateBps` are bps only. | A flat per-charge or per-install commission can't be expressed. | ADR-012 (minor, C2) |
| G7 | **No RBAC for the new surfaces / actors.** Who may enter the Tool Shell? Who approves a tool's publish? Is there a "tool developer" role distinct from platform operator? Agency-side, who can subscribe/spend? | RBAC today is admin-audience only (`apps:*`, `payouts:release`, …). Tools add scopes and an agency-side spend permission. | `03-modules/users-rbac.md` update + `entitlements.md` |
| G8 | **Skills have no contract to validate against.** A validator that checks "does this work on Nova" needs a machine-checkable description of *what Nova supports* (capabilities, plan shapes, module taxonomy, store-bridge scopes). | Otherwise the validator's "platform-fit" check is vibes. | `09-skills/` ships a **Platform Capability Manifest** the skills read |

### 1.3 Improvements I'd add to the proposal

- **Unify availability + entitlement across Apps and Tools** (one `Availability` policy + one `Entitlement` resolver), rather than building tool-licensing as a parallel silo. Apps get the public-with-denylist upgrade for free; Tools get install-attribution semantics for free.
- **A reference Tool, the way Encore is the reference App.** Build one greenfield tool (suggest an agency-facing one with light Store Bridge use, e.g. a bulk metafield/price editor or a cross-store analytics rollup) to prove the Tool path end-to-end before opening the Tool Shell to general use. Mirrors Encore's role.
- **Make the validator output and the registry seeder the same schema.** If the validator emits the exact JSON the ingestor seeds and the registry stores, you remove a translation layer and the spec literally *is* the config. (See `09-skills/` "Nova App/Tool Spec Schema.")
- **Treat the Platform Capability Manifest as a first-class, versioned artifact.** It is the contract the validators check against, the menu the engine generates from, and the source of truth the docs describe in prose. One file, many readers.
- **Per-tool usage + cost telemetry from day one.** Because tools cost the agency money (metered/per-store), the agency surface must show *projected spend* before the invoice, or churn will be brutal. Cheap if designed in, retrofit-hostile.

---

## 2. Audit of the current Nova platform

### 2.1 Strengths (preserve these — they're the reason this is buildable)

- **Disciplined governance.** `CHANGE-CONTROL.md` with 10 frozen invariants and a C1/C2/C3 process is unusually mature for this stage and is exactly what makes a C3 overhaul tractable.
- **Clean module DAG.** The dependency graph in `architecture.md` is acyclic and money-safe (commissions derive from billing, never the reverse). The new modules slot in without cycles (§3.2).
- **Money modeled as append-only ledgers** (I-5) with integer minor units, snapshotted rates, and reversal entries. This is the hard part of fintech done right; the inbound side should copy it exactly.
- **Strong tenancy + attribution invariants** (I-8 immutable referral, I-9 agency scoping).
- **Spec-first culture** already in place: one spec per module = the unit of change; ADRs record decisions; the Encore build-pack proves spec→app works.

### 2.2 The reality check (state, not criticism)

> The platform is a **Phase-1 fixtures prototype.** Only `auth` + `agency-signup` are implemented; every other API service is an ~8-line stub; the four/five frontends render `FX_*` fixtures; **no DB migration has been run** (R0 pending) despite README/Phase-0 claiming "schema migrates." Source: `process/roadmap-to-real.md`, `process/v1-rebase-report.md`.

Implication for the overhaul: **we are adding architecture to a prototype, not refactoring a live system.** That's the good case — the cost of getting the data model and invariants right *now*, before there are migrations and money, is near zero. The phased plan therefore does R0 (first migration) and the cheap correctness fixes **before** any new surface.

### 2.3 Inconsistencies & flags found in the current platform

These are carried into the consolidated flag list (§4) with IDs.

- **I-3 vs the standalone-repo amendment contradict each other.** `CHANGE-CONTROL.md` I-3 says *"all Prisma models live in `packages/database`. No app defines its own tables."* But `engine.md`'s 2026-06-12 amendment establishes per-app repos each owning their own Prisma schema + migrations. The invariant text is now false. (F1)
- **Surface count is inconsistent.** `00-overview.md` lists 5 surfaces incl. `app-admin`; `architecture.md`'s ASCII diagram shows only web/admin/agency and omits `app-admin`. The module DAG omits `app-admin` too. (F2)
- **`app-admin` still embodies the superseded hosting model.** Its create-app wizard, per-app feature pages, and subdomain middleware assume "backends hosted in the monorepo at subdomains," which the v1 amendment removed. Flagged already as v1-rebase open item #3. (F3)
- **`billing` is an overloaded name.** The existing `billing` module is the *Shopify revenue ledger that feeds commissions* (inbound-from-Shopify, outbound-to-agency basis). The new agency-pays-platform flow is also "billing." Without renaming, every future conversation is ambiguous. (F4)
- **`engine.md` carries contradictory decisions in one file.** The top "v1 amendment" supersedes the "Decisions in force" block below it, but both remain, and the lower block still describes monorepo hosting + `apps/app-admin/db/<slug>/`. A reader can't tell what's true without reading the whole file. (F5)
- **Webhook ingress keys on `appSlug` only.** `WebhookEvent.appSlug` + `@@index([appSlug, topic])` assume webhooks belong to apps. Tools that relay store webhooks via the Store Bridge need a `toolSlug`/source discriminator or the ingress table conflates two product classes. (F6)
- **No platform-level testing or audit mechanism exists.** There's a per-app audit pattern (`encore/PHASE-0-AUDIT.md`) but nothing at the platform level — no test strategy doc, no spec-vs-code drift check, no money-reconciliation harness. The roadmap mentions "e2e suite" only at Phase 5. (F7)
- **`Setting` is a freeform K/V store** holding money-affecting config (`defaultCommissionRateBps`, `commissionBasis`, `minPayoutAmount`). No schema/validation/audit-trail on values that change commission math. (F8, minor)
- **`Store.accessTokenEnc` is nullable and undocumented as to provenance.** It exists but nothing populates it yet; the Store Bridge depends on it being a real OAuth offline token with known scopes. Needs to become a first-class, scoped, rotatable credential. (F9)
- **`commissionBasis` (gross vs net of Shopify fee) is referenced but not pinned.** `Charge.shopifyFeeBps` exists "for net-basis commissions" and `Setting.commissionBasis` implies a toggle, but no spec states the default or where it's enforced. (F10, minor)

---

## 3. Audit of the Encore Shopify app

Encore (`shopify/encore`) is the **reference App** and the proof that spec→app works. Findings:

- **Healthy and on-model.** Standalone repo, React Router (Polaris) app, own Prisma schema (SQLite for dev, seeded `dev.sqlite`), Partner app created (`client_id` captured), wired to the platform via `NOVA-INTEGRATION-CONTRACT.md`. This is exactly the runbook's intended end-state for Stage 3.
- **The integration contract is good and should be generalized, not copied.** `NOVA-INTEGRATION-CONTRACT.md` resolved a real spec contradiction (Nova-signed forwards via `X-Nova-Signature`, not a Shopify-HMAC passthrough). **Recommendation:** promote it from an Encore-local file to a **platform-owned contract** (`03-modules/webhooks.md` + a versioned `INTEGRATION-CONTRACT` the engine injects into every generated app and **tool**), so Tools relay store events through the same verified ingress.
- **The blocking reality is the platform, not Encore.** Encore's *sending* side is implemented; the platform's *receiving* side (`installations.confirm`, webhook ingress) is still placeholders (R1). Encore's Phase-0 end-to-end is therefore deferred. Per memory, Phase 0 also can't run in the sandbox (no pnpm/Shopify CLI/psql, external dev stores) — it runs on your Mac/CI. The overhaul doesn't change this; R1 unblocks it.
- **Encore dev DB is SQLite; platform + apps target Postgres.** Fine for dev, but the runbook should state the prod target explicitly so a generated app doesn't ship SQLite. (F11, minor — belongs in the runbook)
- **`engine.md` references `nova-app-template` (Remix); Encore is React Router.** Naming drift (Remix → React Router is the same lineage, but the template name and the docs should agree). (F12, minor)

Encore needs **no rework** for the overhaul. It becomes the canonical example under `05-product/apps.md`. The parallel task is to create the canonical **Tool** example.

---

## 4. Consolidated flags (ranked; even the minor ones)

Severity: 🔴 correctness/contract · 🟡 clarity/consistency · 🟢 nice-to-have. "Fix in" points to the phase in `06-plan/phased-plan.md`.

| ID | Sev | Flag | Fix in |
|---|---|---|---|
| F1 | 🔴 | I-3 invariant text contradicts the standalone-repo reality (per-app/-tool DBs). Reword I-3 to separate **platform schema** (single, in `packages/database`) from **product schemas** (per app/tool, in their repos). | P1 |
| F6 | 🔴 | Webhook ingress is app-only (`appSlug`); add a product-class discriminator so tools can relay store webhooks through the same verified ingress. | P3/P5 |
| F9 | 🔴 | `Store.accessTokenEnc` must become a scoped, rotatable OAuth offline token owned by the Store Bridge, with recorded scopes + rotation. | P5 |
| F4 | 🟡 | Rename for clarity: keep `billing` = **Shopify revenue ledger (app commission basis)**; introduce `subscriptions` + `metering` for **agency-paid tool revenue**. Add a one-paragraph "two money directions" to `architecture.md`. | P1 |
| F2 | 🟡 | Reconcile surface count to **six** (web, admin, agency, app-admin, **tool-admin**, api) everywhere (overview, architecture diagram, module DAG). | P1 |
| F3 | 🟡 | Re-spec `app-admin` as the **App Shell** (builder/console), dropping the monorepo-hosting UX; add `tool-admin` as the **Tool Shell**. | P2/P4 |
| F5 | 🟡 | Split `engine.md`: keep only the in-force standalone-repo model; move superseded decisions to an ADR "Superseded" appendix. Generalize engine to apps **and** tools. | P2 |
| F7 | 🟡 | Create the missing platform **testing strategy** + **audit mechanism** (`07-quality/`). | P1 |
| F10 | 🟡 | Pin `commissionBasis` default (gross vs net of Shopify fee) and where it's enforced; document in `commissions.md`. | P3 |
| F8 | 🟢 | Give `Setting` a typed, validated, audited schema (money-affecting keys especially). | P3 |
| F11 | 🟢 | Runbook should state Postgres as the prod target for generated apps/tools (Encore dev SQLite is dev-only). | P2 |
| F12 | 🟢 | Align template naming: `nova-app-template` is React Router (not "Remix"); add `nova-tool-template`. | P4 |

---

## 5. The C3 decisions this overhaul forces (and the chosen resolutions)

All recorded as ADRs; summarized here so the trade-offs are in one place.

1. **Two product classes — Apps and Tools** (ADR-007). Apps reach merchants via Shopify install + Shopify Billing; agencies *earn* commission. Tools reach agencies (and, via Store Bridge, stores); agencies *pay* Nova. Same registry/repo/DB/shell/availability skeleton; different money + data plane.
2. **Inbound billing via Stripe** (ADR-008). New `subscriptions` + `metering` modules. Stripe **Meter** objects back every metered price (legacy usage-records API was removed in Stripe `2025-03-31.basil`); 7-day trial, freemium (zero-price plan), premium, and a per-store add-on priced through a meter keyed on active Store Bridge connections. Amends **I-6** (revenue may now also enter via verified Stripe webhooks) without weakening it (still webhook-sourced, still ledgered, still never hand-inserted).
3. **Store Bridge as a first-class data plane** (ADR-009). A Nova-owned OAuth (custom-distribution) Shopify app mints **offline access tokens** per store (custom apps are single-store and non-rotatable → unusable for multi-store agencies). Tools call the store **only** through the Bridge's scoped, audited, rate-limited GraphQL Admin proxy; webhooks relay through the platform's existing verified ingress. Reuses `Store`, hardens its token (F9).
4. **Tool Shell + per-tool DB** (ADR-010). Symmetric with App Shell + per-app DB; reconciles I-3 (F1).
5. **Unified availability + entitlements** (ADR-011). One `Availability` policy (`PRIVATE` allowlist | `PUBLIC` denylist) for apps and tools; one `Entitlement` resolver that answers access + remaining quota from {admin grant, paid subscription, trial, freemium limit}. Closes G4, G5, G7 (agency-side).
6. **Flat + percentage commissions** (ADR-012, minor C2). `commissionModel ∈ {PERCENT, FLAT}` (named to avoid the existing `CommissionType` ledger-kind enum), snapshotted on each `Commission` like `rateBps` is today.

### 3.2 New module DAG (additions only; still acyclic)

```
tools-registry  ──► (none)
store-bridge    ──► stores, tools-registry            (scoped Admin proxy + token broker)
subscriptions   ──► tools-registry, agencies          (inbound Stripe; agency is payer)
metering        ──► subscriptions, store-bridge        (usage events → Stripe meters)
entitlements    ──► subscriptions, tools-registry, agencies   (access + quota authority)
tool-engine     ──► tools-registry                     (scaffold/deploy tool repos)
webhooks (ext.) ──► installations, billing, store-bridge   (ingress now also relays tool store-events)
```
No reverse edges; `entitlements` is read by surfaces/guards but reads only downward.

---

## 6. Where this lands (rest of the deliverables)

| Concern | Document |
|---|---|
| Doc map / how to navigate | `docs/00-overview.md`, `docs/01-architecture/glossary.md` |
| Target architecture, money directions | `01-architecture/architecture.md`, `money-flows.md` |
| Data model v2 | `01-architecture/domain-model.md` |
| Frozen rules updated | `CHANGE-CONTROL.md` (I-3 reword, I-6 amend, I-11..I-14) |
| Decisions | `01-architecture/decisions/ADR-007..012` |
| The three shells | `02-shells/{admin,app,tool}-shell.md`, `agency-surface.md` |
| New modules | `03-modules/{tools-registry,tool-engine,store-bridge,entitlements,subscriptions,metering}.md` |
| Product lifecycles | `05-product/{apps,tools}.md` |
| Sequenced build | `06-plan/phased-plan.md` |
| Audit + testing mechanism | `07-quality/{testing-strategy,audit-mechanism}.md` |
| Creation skills | `09-skills/` (+ installable `.skill` bundles) |
| Repeatable runbook | `process/README.md` (generalized to apps + tools) |
