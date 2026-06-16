import { z } from "zod";

/** Tool registry DTOs (spec: docs/03-modules/tools-registry.md). Billing fields are metadata only
 *  in P3 — Stripe wiring is P6. */

export const toolSlugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "dns-safe lowercase slug");

export const toolTypeSchema = z.enum(["AGENCY", "STORE", "HYBRID"]);
export const toolPlanModelSchema = z.enum(["FREE", "FREEMIUM", "PREMIUM"]);
export const toolPlanIntervalSchema = z.enum(["EVERY_30_DAYS", "ANNUAL"]);

export const createToolSchema = z.object({
  name: z.string().min(2).max(80),
  slug: toolSlugSchema,
  description: z.string().max(2000).optional(),
  iconUrl: z.string().url().optional(),
  toolType: toolTypeSchema,
  usesStoreBridge: z.boolean().optional(),
  requiredScopes: z.array(z.string()).optional(),
});
export type CreateToolDto = z.infer<typeof createToolSchema>;

/** toolType + usesStoreBridge are fixed at creation (I-11) — not updatable. */
export const updateToolSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).optional(),
  iconUrl: z.string().url().optional(),
  requiredScopes: z.array(z.string()).optional(),
});
export type UpdateToolDto = z.infer<typeof updateToolSchema>;

export const upsertToolPlanSchema = z.object({
  name: z.string().min(1).max(60),
  model: toolPlanModelSchema.default("FREEMIUM"),
  baseAmount: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  interval: toolPlanIntervalSchema.default("EVERY_30_DAYS"),
  trialDays: z.number().int().min(0).max(365).default(7),
  perStore: z.boolean().default(false),
  perStoreAmount: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});
export type UpsertToolPlanDto = z.infer<typeof upsertToolPlanSchema>;
