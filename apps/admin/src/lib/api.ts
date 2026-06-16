import { cookies } from "next/headers";
import type { AuthMeResponse } from "@nova/shared";

const API_URL = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

/** Server-side API call forwarding the request cookies (RSC/route handlers). */
export async function apiServer<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function getMe(): Promise<AuthMeResponse | null> {
  return apiServer<AuthMeResponse>("/auth/me");
}

// ─── v2 data readers (Commit 6) — replace FX_* fixtures in pages ─────
export interface AppPlanView {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  trialDays: number;
  shopifyHandle: string | null;
  isActive: boolean;
}
export interface AppAdminView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  listingUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "DELISTED";
  pricingModel: "FREE" | "FREEMIUM" | "PREMIUM";
  hasApiSecret: boolean;
  hasWebhookSecret: boolean;
  plans: AppPlanView[];
  createdAt: string;
  updatedAt: string;
}
export interface AdminStoreView {
  id: string;
  shopDomain: string;
  name: string | null;
  agencyId: string;
  createdAt: string;
  agency: { id: string; name: string; slug: string };
}
export interface AvailabilityView {
  id: string;
  productType: "APP" | "TOOL";
  productId: string;
  mode: "PRIVATE" | "PUBLIC";
  entries: Array<{ agencyId: string; effect: "ALLOW" | "DENY" }>;
}
interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export async function listApps(cursor?: string): Promise<Page<AppAdminView>> {
  return (
    (await apiServer<Page<AppAdminView>>(`/admin/apps${cursor ? `?cursor=${cursor}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

export async function getApp(id: string): Promise<AppAdminView | null> {
  return apiServer<AppAdminView>(`/admin/apps/${id}`);
}

/** By slug — for the slug-keyed app-detail page. */
export async function getAppBySlug(slug: string): Promise<AppAdminView | null> {
  return apiServer<AppAdminView>(`/admin/apps/by-slug/${slug}`);
}

export async function listAdminStores(cursor?: string): Promise<Page<AdminStoreView>> {
  return (
    (await apiServer<Page<AdminStoreView>>(`/admin/stores${cursor ? `?cursor=${cursor}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

export async function getAvailability(
  productType: "APP" | "TOOL",
  productId: string,
): Promise<AvailabilityView | null> {
  return apiServer<AvailabilityView>(`/admin/availability/${productType}/${productId}`);
}

// ─── Money + agencies readers (P2) ──────────────────────────────────
export interface CommissionAdminView {
  id: string;
  type: "EARNED" | "REVERSAL" | "ADJUSTMENT";
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED";
  commissionModel: "PERCENT" | "FLAT";
  basisAmount: number;
  rateBps: number;
  flatAmount: number | null;
  amount: number;
  currency: string;
  createdAt: string;
  agency: { id: string; slug: string; name: string } | null;
  charge?: { installation?: { app?: { slug: string }; store?: { shopDomain: string } } } | null;
}
export interface AgencyLite {
  id: string;
  slug: string;
  name: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED";
}

export async function listCommissions(cursor?: string): Promise<Page<CommissionAdminView>> {
  return (
    (await apiServer<Page<CommissionAdminView>>(`/admin/commissions${cursor ? `?cursor=${cursor}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

export async function listAgencies(status?: string): Promise<AgencyLite[]> {
  const res = await apiServer<Page<AgencyLite>>(`/admin/agencies${status ? `?status=${status}` : ""}`);
  return res?.items ?? [];
}

export interface ChargeAdminView {
  id: string;
  externalId: string;
  type: "SUBSCRIPTION" | "ONE_TIME" | "USAGE" | "REFUND";
  amount: number;
  currency: string;
  occurredAt: string;
  installation: {
    agencyId: string;
    app: { name: string; slug: string };
    store: { shopDomain: string };
  };
}
export interface AdminOverview {
  grossAllTime: number;
  gross30d: number;
  activeInstalls: number;
  pendingAgencies: number;
  byApp: Array<{ slug: string; name: string; gross: number }>;
  commissions: { pending: number; approved: number; paid: number; reversed: number };
}

export async function listCharges(cursor?: string): Promise<Page<ChargeAdminView>> {
  return (
    (await apiServer<Page<ChargeAdminView>>(`/admin/charges${cursor ? `?cursor=${cursor}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

export interface ToolPlanView {
  id: string;
  name: string;
  model: "FREE" | "FREEMIUM" | "PREMIUM";
  baseAmount: number;
  currency: string;
  interval: string;
  trialDays: number;
  perStore: boolean;
  perStoreAmount: number | null;
  isActive: boolean;
}
export interface ToolAdminView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "DELISTED";
  toolType: "AGENCY" | "STORE" | "HYBRID";
  usesStoreBridge: boolean;
  requiredScopes: string[];
  plans: ToolPlanView[];
  createdAt: string;
  updatedAt: string;
}

export async function listTools(cursor?: string): Promise<Page<ToolAdminView>> {
  return (
    (await apiServer<Page<ToolAdminView>>(`/admin/tools${cursor ? `?cursor=${cursor}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

export async function getToolBySlug(slug: string): Promise<ToolAdminView | null> {
  return apiServer<ToolAdminView>(`/admin/tools/by-slug/${slug}`);
}

export async function getToolGrants(
  toolId: string,
): Promise<Array<{ agencyId: string; status: "ACTIVE" | "INACTIVE" }>> {
  return (await apiServer<Array<{ agencyId: string; status: "ACTIVE" | "INACTIVE" }>>(`/admin/tools/${toolId}/grants`)) ?? [];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return (
    (await apiServer<AdminOverview>("/admin/metrics/overview")) ?? {
      grossAllTime: 0,
      gross30d: 0,
      activeInstalls: 0,
      pendingAgencies: 0,
      byApp: [],
      commissions: { pending: 0, approved: 0, paid: 0, reversed: 0 },
    }
  );
}
