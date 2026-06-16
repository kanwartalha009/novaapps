# Module: availability

**Owns:** the unified availability policy for **apps and tools** — who may see/activate a product (ADR-011). Distinct from `entitlements` (which decides *current usability + quota* for tools); availability decides *offerability*.
**Depends on:** (reads apps-registry/tools-registry only to validate the product exists). **Consumed by:** apps-registry catalog, tools-registry catalog, admin shell, (later) entitlements.

## Behavior
- One policy per product `(productType: APP|TOOL, productId)` with `mode`:
  - `PRIVATE` — allowlist: available only to agencies with an `ALLOW` entry.
  - `PUBLIC` — available to all agencies **except** those with a `DENY` entry (exclusions).
- No policy row = **not offered** (default deny).
- `set` replaces the whole policy (mode + entries) atomically and writes an `AuditLog` row (`action: availability.update`) — 07-quality §D requires it.
- Migration (P3): existing `AgencyApp` rows seed `Availability(APP, …, PRIVATE)` + `ALLOW` entries.
- `AvailabilityEntry.agencyId` is not FK'd (polymorphic join); validated at the service layer.

## Endpoints
```
GET /admin/availability/:productType/:productId   [availability:write]   read policy
PUT /admin/availability/:productType/:productId   [availability:write]   replace mode + entries (audited)
```

## Resolver (consumed by catalogs)
```
isAvailable(productType, productId, agencyId):
  policy = find(productType, productId); if none → false
  PUBLIC → not(any DENY entry for agencyId)
  PRIVATE → any ALLOW entry for agencyId
```

## Status
Implemented P1/Commit 5 (`apps/api/src/modules/availability`). `apps-registry.catalogForAgency` consumes it; tools catalog wires in at P3.
