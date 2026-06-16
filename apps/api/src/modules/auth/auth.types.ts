import type { Audience } from "@nova/shared";

export interface AccessTokenPayload {
  sub: string; // userId
  aud: Audience;
  email: string;
  name: string;
  /** admin tokens: permission snapshot */
  permissions?: string[];
  /** agency tokens: tenant binding (invariant I-9) */
  agencyId?: string;
  agencySlug?: string;
  agencyRole?: "OWNER" | "MEMBER";
}

export const ACCESS_COOKIE = "nova_access";
export const REFRESH_COOKIE = "nova_refresh";
export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
