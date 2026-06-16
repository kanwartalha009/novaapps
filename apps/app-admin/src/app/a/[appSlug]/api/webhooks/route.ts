import { NextRequest, NextResponse } from "next/server";
import { getHostedApp } from "@/lib/apps-registry";

/**
 * Shopify webhook receiver — public URL: [app-slug].nova-platform.localhost:3003/api/webhooks.
 * Phase 2: verify X-Shopify-Hmac-Sha256 against this app's webhook secret (raw body),
 * write app-local data to THIS APP'S database, and forward billing/lifecycle topics to
 * the platform ingress (POST {API}/v1/webhooks/shopify/{appSlug}) — charges → commissions.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = await ctx.params;
  const hosted = getHostedApp(appSlug);
  if (!hosted) return NextResponse.json({ error: "Unknown app" }, { status: 404 });

  const topic = req.headers.get("x-shopify-topic") ?? "unknown";
  const webhookId = req.headers.get("x-shopify-webhook-id") ?? "n/a";
  console.log(`[app-admin:${appSlug}] webhook ${topic} (${webhookId}) — stub ack, forwards to platform ingress in Phase 2`);

  return NextResponse.json({ ok: true, app: appSlug, topic });
}
