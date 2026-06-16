"use server";

import { cookies } from "next/headers";

/**
 * Server actions for agency mutations. Run on the server, forward the auth cookie to the API
 * (no CORS, cookie stays httpOnly). Return a typed result; the caller refreshes the route.
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

export async function connectStore(input: { shopDomain: string; name?: string }) {
  return call("/agencies/me/stores", { method: "POST", body: JSON.stringify(input) });
}

export async function disconnectStore(id: string) {
  return call(`/agencies/me/stores/${id}`, { method: "DELETE" });
}

// ─── Tool billing (P6) ──────────────────────────────────────────────
export async function subscribeTool(toolId: string, toolPlanId: string) {
  return call(`/agencies/me/tools/${toolId}/subscribe`, { method: "POST", body: JSON.stringify({ toolPlanId }) });
}

export async function cancelSubscription(id: string) {
  return call(`/agencies/me/subscriptions/${id}/cancel`, { method: "POST" });
}
