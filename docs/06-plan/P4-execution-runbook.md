# P4 — Execution Runbook (Tool Shell + tool-engine + reference tool)

P4 makes Tools *buildable*: a Tool Shell to author the blueprint, a `tool-engine` to export the build-pack + orchestrate, and a **reference tool** (the Tool-class analogue of Encore). Mirrors how the App track stands (engine spec'd, `app-admin` = builder console, Encore = a separate repo). **No Stripe** (P6), **no Store Bridge runtime** (P5).

> Three very different sizes: ① `tool-engine` (backend, sandbox-authorable) · ② `tool-admin` (a whole new Next app — large) · ③ the reference tool (its own repo — greenfield, built on your Mac/CI).

## Commit 1 — tool-engine (backend)  `[✓ authored]`
Platform-side engine for tools (`03-modules/tool-engine.md`):
- `GET/PATCH /admin/tool-engine/tools/:id/spec` — blueprint CRUD (`Tool.spec` jsonb).
- `GET /admin/tool-engine/tools/:id/spec/export` — **build-pack markdown** (config + scopes + plans + blueprint + integration-contract wiring: entitlement checks, Store Bridge if used, usage reporting, webhook relay). This is the doc Cowork/a dev implements the tool repo from.
- `GET/PATCH /admin/tool-engine/tools/:id/bridge` — `requiredScopes` + `usesStoreBridge` config.
- `GET/PATCH /admin/tool-engine/tools/:id/checklist` — release checklist (`Tool.releaseChecklist`).
- `POST /internal/tool-engine/ci-callback` (HMAC) — CI reports `latestVersion`/`repoUrl`.
**Acceptance:** author a blueprint on a tool, export a coherent build-pack, record a CI version.

## Commit 2 — tool-admin (Tool Shell, new Next app)  `[✓ authored]`
`apps/tool-admin` (:3004, `[tool-slug].nova-tools.localhost`). Built by selectively copying app-admin's **shared chrome** (configs + `components/*` + `globals.css` + `lib/cn`) and writing the tool routes fresh, **wired to the real `tool-engine`/`tools-registry` API** (server-fetch, cookie-forwarded) — not fixtures:
- `middleware.ts` (subdomain → `/t/[toolSlug]`), root `layout`/`page`, `lib/api.ts`, fresh `nav-links`.
- `t/[toolSlug]/`: **Overview**, **Blueprint** (`/specs`), **Build pack** (`/export` — renders the engine's markdown), **Store Bridge** (`/bridge`), **Plans**, **Release** (checklist). Graceful `NotConnected` state when unauthed.
- Read-only for now (the build-pack export is the working centerpiece); in-shell **editing** (blueprint/scopes/checklist) + cross-subdomain admin auth are the next increment (same auth gap app-admin has).
**Run:** `pnpm install` (links the new workspace package) → `pnpm typecheck` → `pnpm dev` → `http://[tool-slug].nova-tools.localhost:3004`.

## Commit 3 — nova-tool-template + reference tool  `[ ] greenfield, Mac/CI]`
- **`nova-tool-template`** — a standalone repo template wired with the Nova layer: entitlement client (server-side check via `POST /v1/entitlements/:toolSlug/check`, HMAC `NOVA_ENTITLEMENT_SECRET`), Store Bridge client stub (P5), usage reporter stub (P6), webhook relay target, per-tool Postgres + Prisma.
- **Reference tool** — pick an `AGENCY` tool (e.g. cross-store bulk editor or analytics rollup, Bridge off initially). Built from its build-pack on your Mac, deployed standalone, registered via `tools-registry` + granted to an agency. The Tool-class Encore.
**Authored here:** the template structure + the reference tool's `*-BUILD-PACK.md` / `-DELIVERY-PLAN.md` / `-PREREQUISITES.md` (via the `nova-spec-ingestor` skill). **Built/run on your Mac/CI.**

## Commit 4 — post-P4 audit  `[ ] to code`
`docs/audits/PHASE-P4-AUDIT.md`: standalone-repo model, server-side entitlement check in the template, integration-contract conformance, exit gate (a Tool-Shell-created tool runs as its own repo+DB, checks entitlements, usable by a granted agency).

## Status
- [x] Commit 1 tool-engine (backend, authored)
- [x] Commit 2 tool-admin Next app (Tool Shell :3004) — **authored** (shared chrome cloned, tool routes wired to tool-engine API; read-only + build-pack export)
- [x] Commit 3 nova-tool-template (`tools/nova-tool-template/`) + reference tool **Outreach Composer** (`tools/outreach-composer/`); the running repo is built on Mac/CI
- [x] Commit 4 post-P4 audit — `audits/PHASE-P4-AUDIT.md` PASS

**P4 COMPLETE (authored).** All 6 surfaces now exist in-repo. Remaining for a *running* Tool track: in-shell editing + cross-subdomain auth (next increment) and the deployed reference tool (Mac/CI). → next platform backend: **P5 Store Bridge**, then **P6 inbound Stripe billing**.
