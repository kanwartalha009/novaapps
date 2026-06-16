# Post-P3 Audit (2026-06-14)

Gate audit for **Phase P3 — Tool track foundation** (tools-registry + entitlements grant-path + Tools UI). Per `07-quality/audit-mechanism.md`. **Verdict: PASS** (pending Mac `pnpm typecheck`). The Tool track is now functional for the *access* path — no billing (P6), no Store Bridge (P5).

## What P3 shipped
- **tools-registry** — admin `/admin/tools` CRUD/publish/plans + agency `/catalog/tools` (availability-filtered, `productType=TOOL`). Mirrors apps-registry; `toolType` + `usesStoreBridge` fixed at create.
- **entitlements (I-12)** — `resolve` (GRANT-only for P3) materializing `Entitlement`; admin grant/revoke + `listGrants`; agency `GET /agencies/me/entitlements`; HMAC `POST /v1/entitlements/:toolSlug/check` for tool backends (P4).
- **frontend** — admin **Tools** pillar (list + create + detail with availability matrix + grants), agency `/tools` catalog with entitlement status, nav entries on both surfaces. New reusable `AvailabilityMatrix` (App + Tool).

## A — Invariant audit
| Inv | Result | Evidence |
|---|---|---|
| I-11 product class fixed | ✅ | `toolType`/`usesStoreBridge` set only on create; `updateTool` cannot change them; no class-mutation path. |
| I-12 entitlements authority | ✅ | access decided solely by `entitlements.resolve` (GRANT activation → access); `Entitlement` is a materialized read-model; agency UI reads it, never decides. Server-side. |
| I-13 Store Bridge only path | ◻︎ N/A→P5 | no tool→store calls exist; STORE/HYBRID tools can be registered but reach no store yet (flag P3-2). |
| I-14 ledgers never mix | ✅ | tools have no revenue yet; entitlements/activations carry no money; App ledgers untouched. |
| I-10 RBAC | ✅ | `tools:read|write|publish|grant` on admin routes; catalog/entitlements are agency-scoped (I-9). |

## B — Spec-vs-code drift
- New code matches `tools-registry.md` + `entitlements.md`. Shared `Availability` (ADR-011) reused for `TOOL`. **Action (minor):** reflect `GET /admin/tools/:id/grants` + `/catalog/tools` in the specs on next docs pass.

## Two-track separation (the explicit requirement)
Verified separate: **new modules** (`tools-registry`, `entitlements`), **own permissions** (`tools:*`), **own catalog** (`/catalog/tools`), **own nav pillars** (admin "Tools", agency "Tools" section), **own registry/table** (`Tool`/`ToolPlan`). **No App code was modified.** Apps remain Shopify-Billing + commission; Tools are Nova-licensed (Stripe at P6). I-11 keeps a product from crossing classes.

## Exit gate (`06-plan/phased-plan.md`)
✅ An `AGENCY` tool can be registered → published → made available → **granted** to an agency → gated by a server-side entitlement (`access=true, reason=GRANT`) — **with no billing and no store access**. The seed proves it (`bulk-editor` PUBLIC, granted to `nova`): `GET /catalog/tools` + `GET /agencies/me/entitlements` return it active.

## Flags
- **P3-1** entitlements is **GRANT-only** in P3 — SUBSCRIPTION / TRIAL / FREEMIUM + metered quota land with **P6** (inbound Stripe billing).
- **P3-2** **Store Bridge** (STORE/HYBRID tools reaching stores) is **P5** — such tools register/publish but can't access store data yet; publish does not yet enforce scope approval.
- **P3-3** the HMAC entitlement-check endpoint exists but is exercised only once tool backends exist (**P4**, `tool-engine` + `nova-tool-template`).
- **Carry:** P2-1 (Shopify payload spike), P1-1 (ESLint boundary) still open.

## Verdict
**P3 PASS.** Both tracks now stand on their own: **Apps** (Shopify, merchant-billed, commission) end-to-end through P2; **Tools** (Nova-licensed, agency access via grant) through P3. Next: **P4 — Tool Shell + tool-engine + reference tool**, then **P5 Store Bridge**, **P6 inbound Stripe billing**.
