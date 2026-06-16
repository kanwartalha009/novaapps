# ADR-010: Tool Shell + per-tool database

**Status:** Accepted · 2026-06-14 · Class: C3 (under reconciled I-3) · Depends on ADR-007 · Mirrors the App Shell amendment in `engine.md` (2026-06-12).

## Context
Apps already follow the **standalone-repo** model: each App is its own repo with its own Prisma schema + migrations; `apps/app-admin` is the platform-side **builder/console** (the App Shell), not a runtime host; the platform stores metadata only. Tools need the same treatment. This also forces the F1 fix: the old I-3 wording ("no app defines its own tables") was already false for Apps.

## Decision
- **Tool Shell** = `apps/tool-admin` (:3004, wildcard `[tool-slug].nova-tools.localhost`), symmetric with the App Shell: blueprint/spec authoring, build-pack export, `tool-engine` create/deploy orchestration, plans, Store Bridge scope config, release checklist.
- **Per-tool database**: each Tool's standalone repo owns its own DB + schema + migrations (Postgres in prod). The platform DB (`packages/database`) remains the single **platform** schema (reconciled I-3).
- **`tool-engine`** scaffolds a `nova-tool-template` repo wired with: the Nova integration contract (entitlement checks, Store Bridge client if `usesStoreBridge`, webhook relay), Stripe plan constants synced from `ToolPlan`, and CI deploy.

## Consequences
- I-3 reworded (F1) to "platform schema vs product schema."
- Sixth surface (`tool-admin`) added everywhere surfaces are enumerated (F2).
- `engine.md` split: in-force standalone-repo model kept; superseded monorepo-hosting decisions moved to a "Superseded" appendix (F5). `engine` generalizes its shared scaffolding with `tool-engine`.
- A pure agency tool (`usesStoreBridge=false`) still gets a repo + DB + Shell; it simply omits the Bridge client.
