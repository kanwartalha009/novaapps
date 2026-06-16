/** JWT audience per surface (see docs/03-modules/auth.md). */
export const AUDIENCES = ["admin", "agency"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Money: integer minor units + ISO 4217 code. Never floats (invariant I-5/ADR-004). */
export interface Money {
  amount: number; // minor units (cents)
  currency: string; // ISO 4217
}

export const DEFAULT_COMMISSION_RATE_BPS = 2000; // 20.00%
export const COMMISSION_MATURITY_DAYS_DEFAULT = 30;
export const MIN_PAYOUT_AMOUNT_DEFAULT = 5000; // $50.00 in cents
