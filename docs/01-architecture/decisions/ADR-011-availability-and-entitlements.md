# ADR-011: Unified availability + entitlements

**Status:** Accepted · 2026-06-14 · Class: C3 (adds I-12) · Depends on ADR-007, ADR-008.

## Context
Two distinct questions were tangled together and only half-answered:
- **Availability** — *which agencies may see/activate a product?* Today this is implicit `AgencyApp` opt-in (allowlist only). Kanwar wants "available to all, exclude some" (a denylist mode) and wants it for tools too.
- **Entitlement** — *may this agency use this tool right now, and how much quota is left?* No module owns this, yet trial expiry, metered ceilings, freemium limits, and admin grants all need one authority.

## Decision
**Availability (apps + tools):** one policy per product with two modes — `PRIVATE` (allowlist) or `PUBLIC` (available to all, with **exclusion** rows). `AvailabilityEntry(productType, productId, agencyId, effect=ALLOW|DENY)`. Migration: existing `AgencyApp` rows → PRIVATE ALLOW entries. `AgencyApp` is **retained but narrowed** to the commission-override role (`rateBps`/`commissionModel`/`flatAmount`). App redaction stays gated on no ACTIVE installs.

**Entitlements (tools):** a dedicated `entitlements` module is the **single access/quota authority (I-12)**. For `(agency, tool)` it resolves:
```
access = GRANT ? true
       : (SUBSCRIPTION active|trialing AND withinQuota) ? true
       : (FREEMIUM AND underFreeCeiling) ? true
       : false
```
Quota per metered feature = plan allowance − usage this period (from `metering`). The resolved `Entitlement` is a materialized read-model that API guards and product backends check **server-side** (UI gating is cosmetic). Two activation sources: admin **GRANT** (comped, no Stripe) and self-serve **SUBSCRIPTION** (Stripe).

## Consequences
- Availability and entitlement are cleanly separable: *availability* decides if a tool is offerable; *entitlement* decides if it's currently usable.
- Apps gain PUBLIC-with-denylist for free (G5); tools gain a real licensing authority (G4, G7 agency-side).
- New permissions: `availability:write`, `tools:grant` (admin); `tools:subscribe` (agency OWNER/spend-capable).
- Product backends must call an entitlement check endpoint (or verify a signed entitlement token) before doing gated work — part of the integration contract.
