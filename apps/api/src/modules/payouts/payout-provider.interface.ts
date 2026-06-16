/**
 * Pluggable payout provider contract — ADR-003 / invariant I-7.
 * Drivers: ManualPayoutProvider (Phase 4), StripeConnectProvider (Phase 4),
 * PaypalPayoutProvider (Phase 5). Commission logic must never depend on a driver.
 */
export type PayoutProviderKey = "MANUAL" | "STRIPE_CONNECT" | "PAYPAL";
export type PayoutStatus = "DRAFT" | "PROCESSING" | "PAID" | "FAILED";

export interface PayoutMethodDetails {
  provider: PayoutProviderKey;
  /** bank reference / Stripe account id / PayPal email (decrypted at use) */
  details: Record<string, string>;
}

export interface PayoutBatch {
  payoutId: string;
  agencyId: string;
  totalAmount: number; // minor units
  currency: string;
  method: PayoutMethodDetails;
}

export interface PayoutProvider {
  readonly key: PayoutProviderKey;
  validateMethod(method: PayoutMethodDetails): Promise<void>;
  release(batch: PayoutBatch): Promise<{ providerRef: string }>;
  getStatus(providerRef: string): Promise<PayoutStatus>;
}
