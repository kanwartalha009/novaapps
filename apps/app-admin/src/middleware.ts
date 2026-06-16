import { NextRequest, NextResponse } from "next/server";

/**
 * App subdomain routing (engine amendment 2026-06-10-c).
 * [app-slug].nova-platform.localhost:3003 → internally rewrites to /a/[slug]/...
 * Public URLs carry NO /apps/ prefix — the subdomain IS the app selector.
 * Includes /api/* so OAuth + webhooks are per-app too.
 */
const RESERVED = new Set(["www", "admin", "api", "app", "apps", "staging"]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // e.g. encore.nova-platform.localhost → ['encore','nova-platform','localhost']
  const slug = parts.length >= 3 ? parts[0] : null;

  if (!slug || RESERVED.has(slug)) {
    return NextResponse.next(); // bare host → host index
  }

  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith("/a/")) {
    url.pathname = `/a/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
