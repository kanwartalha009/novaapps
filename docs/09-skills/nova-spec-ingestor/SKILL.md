---
name: nova-spec-ingestor
description: Ingest a validated Nova App Spec or Nova Tool Spec into the platform — generate registry seeders (config rows) plus a phased build doc structure (build pack + delivery plan + prerequisites) ready to execute. Use when the user says "ingest this spec", "scaffold this app/tool", "create seeders for this", "set up the build plan", or hands over a `*-app-spec.md` / `*-tool-spec.md` produced by nova-validator-app / nova-validator-tool.
---

# Nova Spec Ingestor

You turn a **validated Nova App/Tool Spec** into two things: (1) **registry seeders** — the config rows that register the product on the platform; (2) a **doc structure + phased delivery plan** the user (or Cowork) executes to build it. You do **not** build the product — you set up its config and its plan.

## References (read these first)
- `references/platform-capability-manifest.md` — the source of truth for valid values.
- `references/nova-app-spec.schema.md` and `references/nova-tool-spec.schema.md` — the input contracts.
- `references/templates.md` — seeder + build-pack + delivery-plan + prerequisites templates.

## Procedure
1. **Load & detect class.** Read the spec; read its `spec_kind` (`nova-app-spec` | `nova-tool-spec`). Confirm `manifest_version` matches the manifest — fail loudly on mismatch.
2. **Validate against the schema.** Check every **(req)** field + that enum values exist in the manifest (pricing model, tool_type, scopes, module taxonomy). If the `verdict` is `NO-GO`, or any required field is missing/invalid, **stop and report the gaps** — route the user back to the matching validator. Don't seed an invalid spec.
3. **Generate seeders** (per `templates.md`):
   - **App:** `App` + `AppPlan[]` + `Availability` (+ entries) + `AgencyApp` commission defaults + `moduleManifest` + `requiredScopes`/webhooks.
   - **Tool:** `Tool` + `ToolPlan[]` + `Meter[]` + `Availability` + `requiredScopes` + `moduleManifest` + entitlement/freemium config.
   - Emit a TS seed file `seed.<slug>.ts` (idempotent upserts, follows `packages/database/prisma/schema.prisma` v2). While the platform is still a fixtures prototype, **also** emit the matching `FX_*` entries for `@nova/shared/src/fixtures.ts` so the Shells render it before the API exists. State exactly where to merge each.
4. **Generate the doc structure** under `docs/05-product/<class>/<slug>/` (or the user's chosen path):
   - `<slug>-BUILD-PACK.md` — config + conventions + screens (with acceptance) + backend + build order (Encore-style, from §5–7 of the spec).
   - `<slug>-DELIVERY-PLAN.md` — phases with **exit gates** + a **post-phase audit** hook per `07-quality/audit-mechanism.md`; phase 0 names the hard/unknown **spikes**.
   - `<slug>-PREREQUISITES.md` — accounts, toolchain, secrets/env, and blocking spikes (Shopify Partner org / Stripe for tools / Store Bridge scopes).
   - Wire to the platform: include the integration-contract requirements (`X-Nova-Signature`; install-confirm for apps; entitlement check + Store Bridge for tools).
5. **Summarize & hand off** — list the files created, where to merge the seeders, the first phase to execute, and any spec gaps you had to assume.

## Rules
- **Refuse invalid input.** A spec missing required fields or with a NO-GO verdict is not ingestible — report and route back, don't paper over it.
- **Honor the architecture:** standalone-repo per product, per-product DB, platform stores metadata only; App money via Shopify, Tool money via Stripe (never mix, I-14); tools reach stores only via the Store Bridge (I-13); access gated by entitlements (I-12).
- **Idempotent seeders** (upsert on slug); never hand-insert money/commission rows (I-6).
- Delivery plans inherit the platform's gate discipline: every phase has an exit gate **and** a post-phase audit; no phase reopens a frozen contract.
- Keep class separation strict — an app spec never produces tool seeders and vice-versa (I-11).
