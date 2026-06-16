"use server";

import { cookies } from "next/headers";

/**
 * Server actions for admin mutations. Run on the server, forward the auth cookie to the API
 * (no CORS; httpOnly cookie never reaches the client). RBAC is enforced API-side (I-10).
 */
const API_URL = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, init: RequestInit): Promise<ActionResult<T>> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { cookie, "content-type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    return { ok: false, error: msg ?? `Request failed (${res.status})` };
  }
  return { ok: true, data: (await res.json().catch(() => ({}))) as T };
}

export async function createApp(input: {
  name: string;
  slug: string;
  description?: string;
  pricingModel?: "FREE" | "FREEMIUM" | "PREMIUM";
}) {
  return call("/admin/apps", { method: "POST", body: JSON.stringify(input) });
}

export async function updateApp(id: string, input: Record<string, unknown>) {
  return call(`/admin/apps/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function publishApp(id: string) {
  return call(`/admin/apps/${id}/publish`, { method: "POST" });
}

export async function upsertAppPlan(
  id: string,
  input: { name: string; amount: number; currency?: string; interval?: string; trialDays?: number },
) {
  return call(`/admin/apps/${id}/plans`, { method: "POST", body: JSON.stringify(input) });
}

export async function setAvailability(
  productType: "APP" | "TOOL",
  productId: string,
  input: { mode: "PRIVATE" | "PUBLIC"; entries: Array<{ agencyId: string; effect: "ALLOW" | "DENY" }> },
) {
  return call(`/admin/availability/${productType}/${productId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function approveCommission(id: string) {
  return call(`/admin/commissions/${id}/approve`, { method: "POST" });
}

export async function adjustCommission(input: {
  agencyId: string;
  amount: number;
  reason: string;
  currency?: string;
}) {
  return call("/admin/commissions/adjust", { method: "POST", body: JSON.stringify(input) });
}

export async function approveAgency(id: string) {
  return call(`/admin/agencies/${id}/approve`, { method: "POST" });
}

// ─── Tools (P3) ─────────────────────────────────────────────────────
export async function createTool(input: {
  name: string;
  slug: string;
  description?: string;
  toolType: "AGENCY" | "STORE" | "HYBRID";
  usesStoreBridge?: boolean;
}) {
  return call("/admin/tools", { method: "POST", body: JSON.stringify(input) });
}

export async function publishTool(id: string) {
  return call(`/admin/tools/${id}/publish`, { method: "POST" });
}

export async function grantTool(toolId: string, agencyId: string) {
  return call(`/admin/tools/${toolId}/grant`, { method: "POST", body: JSON.stringify({ agencyId }) });
}

export async function revokeToolGrant(toolId: string, agencyId: string) {
  return call(`/admin/tools/${toolId}/grant/${agencyId}/revoke`, { method: "POST" });
}
