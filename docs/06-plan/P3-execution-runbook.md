# P3 — Execution Runbook (Tool track foundation)

Granular execution of **P3** from `phased-plan.md`: the **Tools access spine** — register a Tool, make it available, **grant** it to an agency, gate use by a server-side **entitlement** — with **no billing** (Stripe = P6) and **no Store Bridge** (= P5). Kept fully separate from the Apps track per the two-track model. Same conventions: author here, `pnpm typecheck`/`dev` on the Mac.

> **No migration** — `Tool`, `ToolPlan`, `Meter`, `ToolActivation`, `Entitlement` all landed in the P1 v2 migration. P3 is service + endpoint + UI.

## Commit 1 — tools-registry  `[✓ authored]`
Mirror `apps-registry` for the Tool class:
- `tools-registry.service`: `list`/`getById`/`getBySlug`/`create`/`update`/`publish`/`listPlans`/`upsertPlan`/`catalogForAgency` (PUBLISHED + availability-filtered via `AvailabilityService`, `productType=TOOL`). `toolType` (AGENCY/STORE/HYBRID) + `usesStoreBridge` fixed at create (I-11). Plans are metadata only here — **no Stripe** (P6).
- `tools-registry.controller`: `GET/POST/PATCH /admin/tools`, `POST /admin/tools/:id/publish`, `GET/POST /admin/tools/:id/plans` (`tools:read|write|publish`); `GET /catalog/tools` (agency aud).
- Shared `tool` DTOs; module imports `AvailabilityModule`; register in `app.module`.
**Acceptance:** create→publish→`/catalog/tools` shows it for an *available* agency, hidden otherwise; secrets/scopes never leak.

## Commit 2 — entitlements (grant path)  `[✓ authored]` (I-12)
- `entitlements.service`: `resolve(agencyId, toolId)` — **P3 = GRANT-only** (`ToolActivation source=GRANT, status=ACTIVE` → access). SUBSCRIPTION/TRIAL/FREEMIUM are P6. `grant`/`revokeGrant` (write `ToolActivation` + materialize `Entitlement` + `AuditLog`); `listForAgency`; `check(toolSlug, agencyId)` for tool backends.
- `entitlements.controller`: `POST /admin/tools/:id/grant {agencyId}` + `…/grant/:agencyId/revoke` (`tools:grant`); `GET /agencies/me/entitlements` (agency aud); `POST /v1/entitlements/:toolSlug/check` (HMAC, for tool backends — wired fully in P4).
**Acceptance:** admin grants an AGENCY tool to an agency → `resolve` returns access=true reason=GRANT; revoke → access=false; the decision is server-side (I-12).

## Commit 3 — Tools frontend  `[ ] to code`
Admin **Tools** pillar (list/create/detail with availability matrix + grant); agency `/tools` catalog showing available + granted/active tools. Mirror the Apps UI; server reads + server actions.
**Acceptance:** an operator registers + publishes + grants a tool; the agency sees it active under Tools.

## Commit 4 — post-P3 audit  `[ ] to code`
`docs/audits/PHASE-P3-AUDIT.md`: I-11 (class fixed), I-12 (entitlements authority, server-side), I-14 (no money mixing — none yet), drift, exit gate.

## Run on your Mac (after Commits 1–2)
```bash
pnpm build && pnpm typecheck
# seed already creates tool "bulk-editor" (PUBLIC) granted to agency "nova" — exercise:
#   GET /v1/catalog/tools           (as agency)        → bulk-editor listed
#   GET /v1/agencies/me/entitlements (as agency)       → bulk-editor access=true (GRANT)
```

## Status
- [x] Commit 1 tools-registry (authored; DTOs typecheck-verified)
- [x] Commit 2 entitlements grant-path (authored)
- [x] Commit 3 Tools frontend — admin Tools pillar (list/create/detail+availability+grants) + agency /tools catalog + nav (both surfaces) + reusable AvailabilityMatrix
- [x] Commit 4 post-P3 audit — `audits/PHASE-P3-AUDIT.md` PASS

**P3 COMPLETE** (pending Mac `pnpm typecheck`). Both tracks stand alone. → next **P4 (Tool Shell + tool-engine + reference tool)**.
