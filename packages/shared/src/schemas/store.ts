import { z } from "zod";

/** Store DTOs (spec: docs/03-modules/stores.md). */

export const shopDomainSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i, "must be a *.myshopify.com domain")
  .transform((s) => s.toLowerCase());

export const connectStoreSchema = z.object({
  shopDomain: shopDomainSchema,
  name: z.string().max(120).optional(),
});
export type ConnectStoreDto = z.infer<typeof connectStoreSchema>;
