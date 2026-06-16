import { z } from "zod";

/** Manual commission adjustment (spec: docs/03-modules/commissions.md). Creates a typed
 *  ADJUSTMENT ledger entry — never edits an existing row (I-5). */
export const adjustCommissionSchema = z.object({
  agencyId: z.string().min(1),
  amount: z.number().int(), // minor units; sign is meaningful (credit + / debit −)
  currency: z.string().length(3).default("USD"),
  reason: z.string().min(3).max(500),
});
export type AdjustCommissionDto = z.infer<typeof adjustCommissionSchema>;
