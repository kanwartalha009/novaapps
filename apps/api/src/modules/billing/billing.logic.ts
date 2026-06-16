/**
 * Pure billing decisions (no I/O) — extracted so the money-critical rules are unit-testable.
 * Used by billing.service. See docs/03-modules/billing.md + GO-LIVE-AUDIT.
 */

export interface NovaEnrichment {
  subscriptionId: string | null;
  status: string | null;
  amountMinor: number | null;
  currencyCode: string | null;
  currentPeriodEnd: string | null;
}

/** A subscription accrues ONLY while ACTIVE. Any known non-ACTIVE status stops it (no phantom rev). */
export function accrualStopped(status: string | null | undefined): boolean {
  return !!(status && status !== "ACTIVE");
}

/**
 * Idempotency key. Subscriptions key PER-CYCLE (`subscriptionId:currentPeriodEnd`) so each recurring
 * cycle earns exactly once and a re-sent webhook for the same cycle dedupes. Others fall back to the
 * payload/charge id, then the subscription id, then the webhook id.
 */
export function subscriptionExternalId(
  type: string,
  payload: any,
  nova: { subscriptionId: string | null; currentPeriodEnd: string | null } | null,
  webhookId: string,
): string {
  const rawSub = payload?.app_subscription ?? payload?.appSubscription;
  const subId = nova?.subscriptionId ?? rawSub?.admin_graphql_api_id ?? rawSub?.id?.toString();
  const cycleEnd = nova?.currentPeriodEnd ?? rawSub?.current_period_end;
  return (
    (type === "SUBSCRIPTION" && subId && cycleEnd ? `${subId}:${cycleEnd}` : null) ??
    payload?.id?.toString() ??
    subId ??
    webhookId
  );
}

/** Effective Shopify fee in bps derived from authoritative gross/net (net-basis commissions). */
export function feeBpsFromGrossNet(grossMinor: number, netMinor: number | null): number {
  return grossMinor !== 0 && netMinor != null
    ? Math.max(0, Math.round((1 - netMinor / grossMinor) * 10000))
    : 0;
}
