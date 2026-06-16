import { z } from "zod";

/** App registry DTOs (spec: docs/03-modules/apps-registry.md). */

export const appSlugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "dns-safe lowercase slug");

export const pricingModelSchema = z.enum(["FREE", "FREEMIUM", "PREMIUM"]);
export const planIntervalSchema = z.enum(["EVERY_30_DAYS", "ANNUAL"]);

export const createAppSchema = z.object({
  name: z.string().min(2).max(80),
  slug: appSlugSchema,
  description: z.string().max(2000).optional(),
  iconUrl: z.string().url().optional(),
  listingUrl: z.string().url().optional(),
  pricingModel: pricingModelSchema.optional(),
});
export type CreateAppDto = z.infer<typeof createAppSchema>;

/** Update: everything optional except slug (slug is immutable post-create). Secrets are
 *  write-only plaintext here; the service encrypts → *Enc columns and never returns them. */
export const updateAppSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).optional(),
  iconUrl: z.string().url().optional(),
  listingUrl: z.string().url().optional(),
  pricingModel: pricingModelSchema.optional(),
  shopifyApiKey: z.string().min(1).optional(),
  shopifyApiSecret: z.string().min(1).optional(),
  shopifyWebhookSecret: z.string().min(1).optional(),
});
export type UpdateAppDto = z.infer<typeof updateAppSchema>;

export const upsertAppPlanSchema = z.object({
  name: z.string().min(1).max(60),
  amount: z.number().int().min(0), // minor units (monthly)
  annualAmount: z.number().int().min(0).optional(), // minor units (yearly); omit → derive 20% off
  preorderLimit: z.number().int().min(0).nullable().optional(), // null = unlimited
  notifyLimit: z.number().int().min(0).nullable().optional(), // null = unlimited
  currency: z.string().length(3).default("USD"),
  interval: planIntervalSchema.default("EVERY_30_DAYS"),
  trialDays: z.number().int().min(0).max(365).default(0),
  shopifyHandle: z.string().max(120).optional(),
  isActive: z.boolean().default(true),
});
export type UpsertAppPlanDto = z.infer<typeof upsertAppPlanSchema>;
