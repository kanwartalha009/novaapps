import { z } from "zod";

/** Unified availability DTOs (ADR-011; spec: docs/03-modules/entitlements.md + admin-shell.md). */

export const productTypeSchema = z.enum(["APP", "TOOL"]);
export const availabilityModeSchema = z.enum(["PRIVATE", "PUBLIC"]);
export const availabilityEffectSchema = z.enum(["ALLOW", "DENY"]);

export const setAvailabilitySchema = z.object({
  mode: availabilityModeSchema,
  // PRIVATE → ALLOW entries (allowlist); PUBLIC → DENY entries (exclusions).
  entries: z
    .array(
      z.object({
        agencyId: z.string().min(1),
        effect: availabilityEffectSchema,
      }),
    )
    .default([]),
});
export type SetAvailabilityDto = z.infer<typeof setAvailabilitySchema>;
