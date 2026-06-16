import { NextRequest, NextResponse } from "next/server";

/**
 * Tool Shell subdomain routing (ADR-010).
 * [tool-slug].nova-tools.localhost:3004 → internally rewrites to /t/[slug]/...
 * The subdomain IS the tool selector (no /tools/ prefix in public URLs).
 */
const RESERVED = new Set(["www", "admin", "api", "app", "apps", "tools", "staging"]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // e.g. bulk-editor.nova-tools.localhost → ['bulk-editor','nova-tools','localhost']
  const slug = parts.length >= 3 ? parts[0] : null;

  if (!slug || RESERVED.has(slug)) {
    return NextResponse.next(); // bare host → host index
  }

  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith("/t/")) {
    url.pathname = `/t/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
