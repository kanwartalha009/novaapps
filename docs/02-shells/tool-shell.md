# Shell: Tool Shell

**Runtime:** `apps/tool-admin` (Next.js · :3004 · `[tool-slug].nova-tools.<domain>`). **Audience:** `tool-shell` JWT. **Role:** the per-Tool builder/console — symmetric with the App Shell, for **one Tool's** spec, scaffold, Store Bridge config, plans, and release. (ADR-010)

> Like the App Shell, the Tool Shell **does not host tool backends.** Each Tool is a **standalone repo with its own DB**; the Shell orchestrates and tracks it.

## Sections (per tool `[toolSlug]`)

```
/t/[toolSlug]                overview: type, status, version, links (repo, dashboards)
/t/[toolSlug]/specs          BLUEPRINT — screens (agency surface; store surface if any) + backend spec
/t/[toolSlug]/backend        per-tool Prisma entities, endpoints, jobs, entitlement checks
/t/[toolSlug]/bridge         STORE BRIDGE config: requiredScopes, relayed webhook topics, rate budget
/t/[toolSlug]/plans          pricing: FREE/FREEMIUM/PREMIUM, 7-day trial, metered components, per-store
/t/[toolSlug]/export         BUILD-PACK export (one markdown doc to implement from)
/t/[toolSlug]/release        release checklist → PUBLISHED
```

## Tool type (fixed at creation, drives everything downstream)

| Type | Reaches | Auth/data | Typical billing |
|---|---|---|---|
| `AGENCY` | agency users only | no Store Bridge | seat/usage; no per-store |
| `STORE` | acts on stores | **Store Bridge** required | per-store + metered |
| `HYBRID` | agency UI **and** store actions | Store Bridge optional-per-feature | base + metered + per-store |

`HYBRID` rule (G3): a hybrid tool declares, per feature/module, whether it needs the Bridge; entitlement + billing treat Bridge-using features as the per-store billable surface, agency-only features as base/metered.

## What the Tool Shell drives (via `tool-engine`, ADR-010, `03-modules/tool-engine.md`)
1. **Blueprint** — author the agency-facing screens and (for STORE/HYBRID) the store-action surface; author the backend spec incl. **entitlement check points** and **Store Bridge calls**. Stored as `Tool.spec`.
2. **Create** — `tool-engine` scaffolds a repo from `nova-tool-template` (Nova wiring: entitlement client, Store Bridge client if `usesStoreBridge`, webhook relay), provisions the per-tool DB, writes the registry row (DRAFT) + `moduleManifest`.
3. **Store Bridge config** — declare `requiredScopes` (least-privilege; admin approves), relayed webhook topics, and the per-store cost budget (ADR-009).
4. **Plans** — define `ToolPlan`s; `tool-engine`/`subscriptions` create the matching **Stripe products/prices/meters** (ADR-008) and write back ids.
5. **Release checklist** — Stripe plans live, entitlement checks verified, Bridge scopes approved, (if store-facing) a smoke test against a dev store → `PUBLISHED`.

## Module taxonomy (tool generator targets)
`agency-ui` (the dashboard surface) · `store-actions` (Bridge-mediated read/write jobs) · `jobs` (scheduled/queued work) · `webhooks` (relayed store events) · `api` (tool's own endpoints) · `entitlement-gates` (where access/quota is enforced).

## Endpoints (consumed)
```
GET/PATCH /admin/tool-engine/tools/:id/spec          [tools:write]
GET       /admin/tool-engine/tools/:id/spec/export   [tools:read]
POST      /admin/tool-engine/tools                     [tools:write]   create (repo + DB + registry)
GET/PATCH /admin/tool-engine/tools/:id/bridge          [tools:write]   scopes + relay config
GET/POST/PATCH /admin/tools/:id/plans                  [tools:write]   (→ Stripe)
GET/PATCH /admin/tool-engine/tools/:id/checklist       [tools:write]
POST      /internal/tool-engine/ci-callback            (HMAC)
```

## Reference implementation
*To build:* the canonical Tool (suggest an agency-facing tool with light Store Bridge use) — the Tool-class analogue of Encore (`05-product/tools.md`, phased in `06-plan`).
