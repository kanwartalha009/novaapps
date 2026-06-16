import { NextRequest, NextResponse } from "next/server";

/**
 * Cosmetic gate only — redirects unauthenticated browsers to /login.
 * Real enforcement is the API's JwtAuthGuard (invariant I-10).
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("nova_access") || req.cookies.has("nova_refresh");
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    if (hasSession) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
