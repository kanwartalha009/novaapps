import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Minimal Stripe REST client (form-encoded request, JSON response) — no SDK dependency.
 * Single inbound-billing seam (ADR-008). Requires STRIPE_SECRET_KEY (test mode on the Mac).
 */
export async function stripeFetch<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; form?: Record<string, string | undefined> } = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.form ?? {})) if (v !== undefined) params.append(k, v);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: opts.method ?? "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: (opts.method ?? "POST") === "GET" ? undefined : params.toString(),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path}: ${json?.error?.message ?? res.status}`);
  return json as T;
}

/** Verify a Stripe webhook signature header (`t=…,v1=…`) over the raw body. */
export function verifyStripeSignature(rawBody: Buffer | undefined, header: string | undefined, secret: string): boolean {
  if (!rawBody || !header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k] = v;
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody.toString("utf8")}`).digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
