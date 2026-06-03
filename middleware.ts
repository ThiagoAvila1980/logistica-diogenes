import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessRoute,
} from "@/lib/auth/permissions";
import { isAuthPrefetchRequest } from "@/lib/auth/session-cookie-options";
import { SESSION_COOKIE } from "@/lib/auth/session-types";
import { parseSessionFromToken } from "@/lib/auth/session-edge";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/field",
  "/production",
  "/logistics",
  "/installation",
  "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await parseSessionFromToken(token);

  if (!session) {
    // Prefetch do App Router costuma ir sem Cookie; redirecionar para /login
    // faz a navegação real herdar o redirect mesmo com sessão válida.
    if (isAuthPrefetchRequest(request)) {
      return new NextResponse(null, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessRoute(session.roles, pathname)) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/field/:path*",
    "/production/:path*",
    "/logistics/:path*",
    "/installation/:path*",
    "/admin/:path*",
  ],
};
