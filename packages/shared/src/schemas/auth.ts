import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  audience: z.enum(["admin", "agency"]),
  /** Required when audience === 'agency' — the tenant being logged into. */
  agencySlug: z.string().optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthMeResponse {
  userId: string;
  email: string;
  name: string;
  audience: "admin" | "agency";
  permissions?: string[];
  agency?: { id: string; slug: string; name: string; role: "OWNER" | "MEMBER" };
}
