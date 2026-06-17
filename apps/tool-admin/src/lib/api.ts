import { cookies } from "next/headers";

/** Server-side API call to the platform, forwarding cookies (admin-audience JWT, tools:* perms). */
const API_URL = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

async function apiServer<T>(path: string, asText = false): Promise<T | null> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API_URL}${path}`, { headers: { cookie }, cache: "no-store" });
  if (!res.ok) return null;
  // Defensive: empty/non-JSON 2xx must not crash the page (was throwing on empty body).
  const text = await res.text();
  if (asText) return text as unknown as T;
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export interface ToolPlan {
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
export interface ToolView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "DELISTED";
  toolType: "AGENCY" | "STORE" | "HYBRID";
  usesStoreBridge: boolean;
  requiredScopes: string[];
  latestVersion: string | null;
  repoUrl: string | null;
  plans: ToolPlan[];
}
export interface ChecklistItem { key: string; label: string; done: boolean }

export const getTool = (slug: string) => apiServer<ToolView>(`/admin/tools/by-slug/${slug}`);
export const getSpec = (toolId: string) => apiServer<{ spec: unknown }>(`/admin/tool-engine/tools/${toolId}/spec`);
export const getBridge = (toolId: string) =>
  apiServer<{ usesStoreBridge: boolean; requiredScopes: string[] }>(`/admin/tool-engine/tools/${toolId}/bridge`);
export const getChecklist = (toolId: string) =>
  apiServer<{ checklist: ChecklistItem[] }>(`/admin/tool-engine/tools/${toolId}/checklist`);
export const getPlans = (toolId: string) => apiServer<ToolPlan[]>(`/admin/tools/${toolId}/plans`);
export const getBuildPack = (toolId: string) =>
  apiServer<string>(`/admin/tool-engine/tools/${toolId}/spec/export`, true);
