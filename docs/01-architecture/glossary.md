# Glossary

Canonical definitions. When a term here conflicts with prose elsewhere, this file and `domain-model.md` win.

| Term | Definition |
|---|---|
| **App** | A Shopify App Store app installed on a merchant store. Monetized by **Shopify Billing**; the agency that referred the install **earns commission**. Standalone repo + own DB; registry row + credentials on the platform. |
| **Tool** | Nova-native software used **by an agency** (and optionally acting **on stores** via the Store Bridge). Monetized by **Stripe** (freemium/premium/metered/per-store); the agency **pays**. Standalone repo + own DB; registry row on the platform. |
| **Product class** | "App" or "Tool" — the discriminator that selects money direction, data plane, builder shell, and activation semantics. |
| **Shell** | A platform surface that *governs or builds*. **Admin Shell** governs the marketplace; **App Shell** / **Tool Shell** build one product. Not to be confused with a product's own backend (which is a standalone repo). |
| **Admin Shell** | `apps/admin` (:3001). Operator console: agencies, apps, tools, availability, licensing, payouts, settings. |
| **App Shell** | `apps/app-admin` (:3003). Per-app builder/console: blueprint spec, build-pack export, engine create/deploy, publish checklist. (Formerly described as a backend host — that model is removed.) |
| **Tool Shell** | `apps/tool-admin` (:3004). Per-tool builder/console: blueprint spec, backend, Store Bridge config, plans, release. |
| **Agency surface** | `apps/agency` (:3002). Tenant dashboard: connect stores, install apps (earn), subscribe to/receive tools (pay/comped), see spend + earnings. |
| **Store Bridge** | The Nova-owned data plane that lets a **Tool** read/write a store. A Nova OAuth (custom-distribution) Shopify app mints **offline access tokens** per store; the Bridge exposes a **scoped, audited, rate-limited GraphQL Admin proxy** and relays store webhooks. (ADR-009) |
| **Bridge connection** | A `(tool, store)` link with granted scopes + token reference. A store with ≥1 active bridge connection for a tool is a **billable per-store unit** when the tool's plan charges per store. |
| **Availability** | The policy that decides which agencies *may* see/activate a product: `PRIVATE` (allowlist) or `PUBLIC` (available to all, with a denylist). Applies to both apps and tools. (ADR-011) |
| **Entitlement** | The runtime answer to "may this agency use this product right now, and how much quota remains?" Resolved from {admin grant, paid subscription, active trial, freemium limit}. (ADR-011) |
| **Grant** | An admin-conferred entitlement to a tool (comped access), independent of payment. |
| **Subscription** | An agency's paid (or trialing) relationship to a **tool plan**, backed by a Stripe subscription. |
| **Meter / Meter event** | Stripe's usage primitive. Every metered price is backed by a **Meter**; the platform reports **meter events** (usage) that Stripe aggregates per billing period. (ADR-008) |
| **Commission** | Money the platform owes an **agency** for App revenue it referred. `PERCENT` (bps) or `FLAT` (minor units), snapshotted per charge. (ADR-012) |
| **Payout** | A batch of approved commissions released to an agency through a `PayoutProvider` (manual / Stripe Connect / PayPal). **Outbound.** |
| **Charge** | One App revenue event from Shopify Billing (subscription cycle / one-time / usage / refund). Basis for commissions. |
| **Engine** | The service that scaffolds, deploys, and tracks the publish lifecycle of a product's standalone repo. `engine` for apps, `tool-engine` for tools. |
| **Build pack** | The single self-contained markdown doc a Shell exports for an AI/dev to implement a product (config, screens with acceptance, backend, build order). Encore's is the template. |
| **Nova App/Tool Spec** | The structured spec a **validator skill** outputs and the **ingestor skill** consumes; the same shape the registry seeds. The contract between "idea" and "config." |
| **Platform Capability Manifest** | The versioned, machine-readable description of what Nova supports (module taxonomy, plan shapes, store-bridge scopes, billing models). Validators check against it; the engine generates from it. |
| **Integration contract** | The signed HTTP contract between a product repo and the platform (`X-Nova-Signature`, install-confirm, webhook/store-event ingress). Generalized from Encore's `NOVA-INTEGRATION-CONTRACT.md`. |
| **C1 / C2 / C3** | Change classes: module-internal / cross-module contract / architecture-invariant. (`CHANGE-CONTROL.md`) |
