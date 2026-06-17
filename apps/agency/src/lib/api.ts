import { cookies } from "next/headers";
import type { AuthMeResponse } from "@nova/shared";

const API_URL = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

/** Server-side API call forwarding request cookies. */
export async function apiServer<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  // Defensive: an empty or non-JSON 2xx body must not crash the page (was throwing
  // "Unexpected end of JSON input" on empty responses). Degrade to null.
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Me, validated against the tenant slug from the subdomain (invariant I-9). */
export async function getTenantMe(slug: string): Promise<AuthMeResponse | null> {
  const me = await apiServer<AuthMeResponse>("/auth/me");
  if (!me || me.audience !== "agency" || me.agency?.slug !== slug) return null;
  return me;
}

// ─── v2 data readers (Commit 6) — replace FX_* fixtures in pages ─────
export interface StoreView {
  id: string;
  shopDomain: string;
  name: string | null;
  agencyId: string;
  grantedScopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAppView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  pricingModel: "FREE" | "FREEMIUM" | "PREMIUM";
  plans: Array<{ name: string; amount: number; currency: string; interval: string; trialDays: number }>;
}

/** Stores connected by this agency (tenant resolved from the JWT). */
export async function listStores(): Promise<StoreView[]> {
  return (await apiServer<StoreView[]>("/agencies/me/stores")) ?? [];
}

/** Apps available to this agency (PUBLISHED + availability-filtered). */
export async function getCatalogApps(): Promise<CatalogAppView[]> {
  return (await apiServer<CatalogAppView[]>("/catalog/apps")) ?? [];
}

// ─── Money readers (P2) ─────────────────────────────────────────────
export interface CommissionView {
  id: string;
  type: "EARNED" | "REVERSAL" | "ADJUSTMENT";
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED";
  commissionModel: "PERCENT" | "FLAT";
  amount: number;
  currency: string;
  createdAt: string;
  charge?: { installation?: { app?: { name: string; slug: string } } } | null;
}
export interface CommissionSummary {
  pending: number;
  approved: number;
  paid: number;
  reversed: number;
}

export async function listCommissions(): Promise<CommissionView[]> {
  const res = await apiServer<{ items: CommissionView[] }>("/agencies/me/commissions");
  return res?.items ?? [];
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  return (
    (await apiServer<CommissionSummary>("/agencies/me/commissions/summary")) ?? {
      pending: 0,
      approved: 0,
      paid: 0,
      reversed: 0,
    }
  );
}

// ─── Tools (P3) ─────────────────────────────────────────────────────
export interface CatalogToolView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  toolType: "AGENCY" | "STORE" | "HYBRID";
  usesStoreBridge: boolean;
  plans: Array<{ id: string; name: string; model: string; baseAmount: number; currency: string; interval: string; trialDays: number; perStore: boolean; perStoreAmount: number | null }>;
}
export interface EntitlementView {
  id: string;
  access: boolean;
  reason: "GRANT" | "TRIAL" | "SUBSCRIPTION" | "FREEMIUM" | "NONE";
  toolId: string;
  tool: { id: string; slug: string; name: string; toolType: string; status: string };
}

/** Tools available to this agency (PUBLISHED + availability-filtered). */
export async function getCatalogTools(): Promise<CatalogToolView[]> {
  return (await apiServer<CatalogToolView[]>("/catalog/tools")) ?? [];
}

/** This agency's tool entitlements (P3: GRANT-based access). */
export async function listEntitlements(): Promise<EntitlementView[]> {
  return (await apiServer<EntitlementView[]>("/agencies/me/entitlements")) ?? [];
}

// ─── Billing (P6) ───────────────────────────────────────────────────
export interface SubscriptionView {
  id: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  tool: { slug: string; name: string };
  toolPlan: { name: string; baseAmount: number; currency: string };
}
export interface ProjectedSpendRow {
  tool: string;
  name: string;
  plan: string;
  status: string;
  currency: string;
  baseAmount: number;
  meteredUnits: number;
  currentPeriodEnd: string | null;
}

export async function listSubscriptions(): Promise<SubscriptionView[]> {
  return (await apiServer<SubscriptionView[]>("/agencies/me/subscriptions")) ?? [];
}
export async function getProjectedSpend(): Promise<ProjectedSpendRow[]> {
  return (await apiServer<ProjectedSpendRow[]>("/agencies/me/usage")) ?? [];
}
