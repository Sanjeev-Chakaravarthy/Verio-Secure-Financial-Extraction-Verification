import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_ROUTES, SESSION_COOKIE_NAMES } from "@/lib/constants";

/**
 * Next.js Edge Middleware — UI-level redirect guard.
 *
 * This is NOT a security boundary. It provides UX convenience by redirecting
 * unauthenticated browsers away from protected pages. Actual authorization
 * is enforced server-side in each API route handler via `getSessionContext()`.
 *
 * @see {@link file://src/app/api/[[...route]]/route.ts} for the authoritative
 *   session check that protects every data endpoint.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through without a session check
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublic || pathname === "/") return NextResponse.next();

  // Check for a Better Auth session cookie (set on successful login)
  const hasSession = SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.has(name)
  );

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
