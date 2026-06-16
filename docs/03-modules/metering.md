# Module: metering

**Owns:** usage metering for tools — `Meter` definitions + `UsageRecord` events, reported to Stripe **Meters**. (ADR-008)
**Depends on:** subscriptions, store-bridge. **Consumed by:** entitlements (quota), agency projected-spend, admin usage view.

## Behavior
- Each `ToolPlan.meteredComponents[]` and the `perStore` add-on maps to a Stripe **`Meter`** (`Meter.key`, `stripeMeterId`, `unitLabel`). Required since Stripe removed legacy usage records (`2025-03-31.basil`) — every metered price needs a backing meter.
- **Usage capture:** tool backends (or the Store Bridge, for `active_stores`) report usage → `UsageRecord(subscriptionId, meterId, quantity, occurredAt, stripeMeterEventId)` → emit a Stripe **meter event**. Idempotent on `stripeMeterEventId`.
- **Per-store meter (`active_stores`):** `store-bridge` reports the count of ACTIVE `StoreBridgeConnection`s per (agency, tool) on a schedule; that's the per-store billing unit.
- **Mirror for projected spend:** `UsageRecord` is append-only (I-5); the platform aggregates locally for the agency's *projected-spend* view, but **Stripe's aggregation is the billed source of truth** (reconciled nightly).
- **Quota feed:** entitlements reads usage-this-period per meter to compute remaining quota / freemium ceiling.

## Endpoints
```
POST /v1/tools/:toolSlug/usage               (HMAC)              tool reports usage → meter event
GET  /agency/usage                            [agency]           usage + projected spend
GET  /admin/usage                             [metering:read]    usage + projected revenue
POST /internal/metering/reconcile             (cron/HMAC)        nightly Stripe vs local reconcile
```

## Invariants / notes
- Idempotent usage (no double-billing): `stripeMeterEventId` unique.
- Append-only (I-5); reconciliation discrepancies raise an audit alert (`07-quality/audit-mechanism.md`).
- Meters are created/updated only here (single writer for meters; subscriptions owns subs/prices).
