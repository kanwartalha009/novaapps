/**
 * Permission constants — single source of truth (see docs/03-modules/users-rbac.md).
 * Adding/removing a permission is a C2 change (shared package + DB seed + guards).
 */
export const PERMISSIONS = [
  "users:read",
  "users:write",
  "roles:read",
  "roles:write",
  "apps:read",
  "apps:write",
  "apps:publish",
  // Tools (v2 — ADR-007/011)
  "tools:read",
  "tools:write",
  "tools:publish",
  "tools:grant", // admin comp an agency a tool (no Stripe)
  "agencies:read",
  "agencies:write",
  "stores:read",
  "stores:write", // connect/manage stores + Store Bridge authorize (v2)
  "availability:write", // unified availability policy (v2)
  "billing:read",
  "commissions:read",
  "commissions:approve",
  "payouts:read",
  "payouts:create",
  "payouts:release",
  "subscriptions:read", // tool revenue (v2)
  "metering:read", // tool usage (v2)
  "support:read",
  "support:write",
  "settings:write",
] as const;

/**
 * Agency-side permissions (audience: 'agency'). Distinct from admin permissions above.
 * v2: who in an agency may activate/pay for tools.
 */
export const AGENCY_PERMISSIONS = [
  "tools:subscribe", // start trial / subscribe (OWNER / spend-capable)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const RESERVED_AGENCY_SLUGS = [
  "www",
  "admin",
  "api",
  "app",
  "mail",
  "staging",
  "dev",
] as const;
