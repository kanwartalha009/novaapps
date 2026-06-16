# Post-P4 Audit (2026-06-15)

Gate audit for **Phase P4 — Tool Shell + tool-engine + reference tool**. Per `07-quality/audit-mechanism.md`. **Verdict: PASS for the authorable scope** (tool-engine backend + nova-tool-template + reference-tool build-pack). Two pieces are intentionally Mac/greenfield, mirroring how the App track stands (`app-admin` = fixtures-stage shell; Encore = a separate repo): the **tool-admin Next app** and the **running reference tool repo**.

## What P4 shipped
- **tool-engine** (backend) — blueprint spec CRUD (`Tool.spec`), **build-pack export** (`/admin/tool-engine/tools/:id/spec/export`), bridge scope config, release checklist, HMAC CI callback. Registered in `app.module`.
- **nova-tool-template** (`tools/nova-tool-template/`) — standalone-repo seed: the **entitlement client** (`assertEntitled`, I-12), Store Bridge stub (P5), usage reporter stub (P6), per-tool Prisma + `.env.example`.
- **Reference tool — Outreach Composer** (`tools/outreach-composer/`) — Nova Tool Spec + BUILD-PACK + DELIVERY-PLAN + PREREQUISITES. `AGENCY` type (no Store Bridge) → fully buildable in P4. The Tool-class analogue of Encore.

## A — Invariant audit
| Inv | Result | Evidence |
|---|---|---|
| I-3 platform vs product schema | ✅ | `tool-engine` stores metadata only (`Tool.spec`/`releaseChecklist`/`latestVersion`/`repoUrl`); the tool owns its own DB + Prisma (template). |
| I-11 product class fixed | ✅ | `tool-engine` never mutates `toolType`; build-pack is class-specific. |
| I-12 entitlements authority | ✅ | template's `assertEntitled` calls the platform check server-side before gated work; build-pack mandates it at every gated route. UI gating cosmetic. |
| I-13 Store Bridge only path | ✅ (by construction) | template `bridge.ts` throws until P5; reference tool is `AGENCY` (no store access); no raw tokens anywhere. |
| I-14 ledgers never mix | ◻︎ N/A | no tool revenue yet (P6). |

## B — Integration-contract conformance
The template's entitlement client signs `X-Nova-Signature = sha256=HMAC(body, NOVA_ENTITLEMENT_SECRET)` and POSTs `{agencyId}` to `/v1/entitlements/<slug>/check` — **matches** the platform's `EntitlementsInternalController` (same header, same secret, same body). CI callback matches `tool-engine` (`NOVA_TOOL_CI_SECRET`). ✅

## Standalone-repo model
✅ Confirmed: per-tool repo (`tools/<slug>`, gitignored like `shopify/`), own DB (`TOOL_DB_URL__<SLUG>`), own migrations; platform holds metadata + the build-pack only. `tool-engine` orchestrates, does not host.

## Exit gate (`06-plan/phased-plan.md` P4)
- ✅ The **path** is proven: a Tool registered in the Tools pillar → blueprint authored → build-pack exported → cloned from `nova-tool-template` → entitlement-gated → usable by a granted agency.
- ◻︎ The **running** reference tool (Outreach Composer deployed standalone) is built on the Mac/CI from its build-pack — same status Encore has for Apps (carry, not a P4-code blocker).

## Flags
- **P4-1** `tool-admin` Next app (the Tool Shell UI, :3004) **not built** — large (~25-file clone of `app-admin`). Author here or start on the Mac from the `app-admin` scaffold. Until then the Tools pillar in `admin` + the build-pack export cover authoring.
- **P4-2** Outreach Composer is a **build-pack + template**; the deployed repo is Mac/CI greenfield.
- **Carry:** P3-1 (grant-only → P6), P3-2 (Store Bridge → P5), P2-1 (Shopify payload spike), P1-1 (ESLint boundary).

## Verdict
**P4 PASS (authorable scope).** The Tool track is now *buildable*: engine + template + a worked reference build-pack. Remaining P4 = the `tool-admin` UI + the running reference tool (Mac/greenfield). Next platform backend: **P5 Store Bridge**, then **P6 inbound Stripe billing** (subscriptions/metering + full entitlements), which also lights up Outreach Composer's metered plan.
