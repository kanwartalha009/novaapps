import { NextRequest, NextResponse } from "next/server";
import { getHostedApp } from "@/lib/apps-registry";

/**
 * Shopify OAuth entry — public URL: [app-slug].nova-platform.localhost:3003/api/auth
 * (subdomain selects the app; no /apps/ prefix).
 * Phase 2: redirect to https://{shop}/admin/oauth/authorize with this app's client_id +
 * scopes; callback exchanges the code, stores the token in THIS APP'S database, and
 * confirms the install to the platform (POST /v1/internal/installations/confirm).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = await ctx.params;
  const hosted = getHostedApp(appSlug);
  if (!hosted) return NextResponse.json({ error: "Unknown app" }, { status: 404 });

  const shop = req.nextUrl.searchParams.get("shop");
  return NextResponse.json({
    app: appSlug,
    status: "stub",
    next: shop
      ? `would redirect to https://${shop}/admin/oauth/authorize (scopes: ${hosted.app.scopes.join(",")})`
      : "missing ?shop= parameter",
  });
}
