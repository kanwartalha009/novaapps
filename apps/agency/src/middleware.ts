import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain multi-tenancy (ADR-005).
 * [slug].nova-apps.localhost:3002 → rewrites to /t/[slug]/...
 * Authorization happens at the API (invariant I-9) — this is routing only.
 */
const RESERVED = new Set(["www", "admin", "api", "app", "mail", "staging", "dev"]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // e.g. acme.nova-apps.localhost → ['acme','nova-apps','localhost']
  const slug = parts.length >= 3 ? parts[0] : null;

  if (!slug || RESERVED.has(slug)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith("/t/")) {
    url.pathname = `/t/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
