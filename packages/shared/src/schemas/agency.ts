import { z } from "zod";
import { RESERVED_AGENCY_SLUGS } from "../permissions";

export const agencySlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "dns-safe lowercase slug")
  .refine((s) => !(RESERVED_AGENCY_SLUGS as readonly string[]).includes(s), {
    message: "reserved slug",
  });

export const agencySignupSchema = z.object({
  agencyName: z.string().min(2).max(80),
  slug: agencySlugSchema,
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(80),
  password: z.string().min(8),
});
export type AgencySignupDto = z.infer<typeof agencySignupSchema>;
