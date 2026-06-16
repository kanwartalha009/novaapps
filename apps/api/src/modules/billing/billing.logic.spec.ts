import { describe, it, expect } from "vitest";
import { accrualStopped, subscriptionExternalId, feeBpsFromGrossNet } from "./billing.logic";

describe("accrualStopped (no phantom commissions)", () => {
  it("keeps accruing while ACTIVE", () => {
    expect(accrualStopped("ACTIVE")).toBe(false);
  });

  it("stops on every non-ACTIVE status (uninstall/cancel/freeze)", () => {
    for (const s of ["CANCELLED", "EXPIRED", "FROZEN", "DECLINED", "PENDING"]) {
      expect(accrualStopped(s)).toBe(true);
    }
  });

  it("does not stop when status is unknown (null/undefined → fall through to amount checks)", () => {
    expect(accrualStopped(null)).toBe(false);
    expect(accrualStopped(undefined)).toBe(false);
  });
});

describe("subscriptionExternalId (per-cycle idempotency)", () => {
  const nova = {
    subscriptionId: "gid://shopify/AppSubscription/1",
    currentPeriodEnd: "2026-07-15T00:00:00Z",
  };

  it("keys a subscription charge per cycle", () => {
    expect(subscriptionExternalId("SUBSCRIPTION", {}, nova, "wh1")).toBe(
      "gid://shopify/AppSubscription/1:2026-07-15T00:00:00Z",
    );
  });

  it("dedupes the same cycle but accrues the next one (recurring revenue)", () => {
    const sameCycle = subscriptionExternalId("SUBSCRIPTION", {}, nova, "wh-a");
    const sameCycleAgain = subscriptionExternalId("SUBSCRIPTION", {}, nova, "wh-b");
    const nextCycle = subscriptionExternalId(
      "SUBSCRIPTION",
      {},
      { ...nova, currentPeriodEnd: "2026-08-15T00:00:00Z" },
      "wh-c",
    );
    expect(sameCycle).toBe(sameCycleAgain); // re-sent webhook → one charge
    expect(sameCycle).not.toBe(nextCycle); // month 2 → a new charge
  });

  it("falls back to the raw payload subscription id + period when _nova is absent", () => {
    const payload = {
      app_subscription: {
        admin_graphql_api_id: "gid://shopify/AppSubscription/2",
        current_period_end: "2026-09-01T00:00:00Z",
      },
    };
    expect(subscriptionExternalId("SUBSCRIPTION", payload, null, "wh1")).toBe(
      "gid://shopify/AppSubscription/2:2026-09-01T00:00:00Z",
    );
  });

  it("uses the payload id for one-time charges", () => {
    expect(subscriptionExternalId("ONE_TIME", { id: 999 }, null, "wh1")).toBe("999");
  });

  it("falls back to the webhook id when nothing else identifies the charge", () => {
    expect(subscriptionExternalId("SUBSCRIPTION", {}, null, "wh-last")).toBe("wh-last");
  });
});

describe("feeBpsFromGrossNet (net-basis commissions)", () => {
  it("derives the effective fee in bps from gross/net", () => {
    expect(feeBpsFromGrossNet(2000, 1700)).toBe(1500); // $20 gross, $17 net → 15%
  });

  it("returns 0 when net is unknown", () => {
    expect(feeBpsFromGrossNet(2000, null)).toBe(0);
  });

  it("returns 0 for a zero gross (no divide-by-zero)", () => {
    expect(feeBpsFromGrossNet(0, 0)).toBe(0);
  });

  it("never goes negative even if net exceeds gross (credits/adjustments)", () => {
    expect(feeBpsFromGrossNet(1000, 1200)).toBe(0);
  });
});
