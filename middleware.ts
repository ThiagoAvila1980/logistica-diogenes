import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminOnlyPath } from "@/lib/auth/permissions";
import { isAuthPrefetchRequest } from "@/lib/auth/session-cookie-options";
import { SESSION_COOKIE } from "@/lib/auth/session-types";
import { parseSessionFromToken } from "@/lib/auth/session-edge";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/field",
  "/production",
  "/logistics",
  "/installation",
  "/concluded",
  "/admin",
  "/reports",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await parseSessionFromToken(token);

  if (!session) {
    if (isAuthPrefetchRequest(request)) {
      return new NextResponse(null, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* é exclusivo de admin — gate imutável no Edge
  if (isAdminOnlyPath(pathname) && !session.roles.includes("admin")) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Repassa o pathname para que o layout Node possa fazer o gate dinâmico
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-pathname": pathname,
      }),
    },
  });

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/field/:path*",
    "/production/:path*",
    "/logistics/:path*",
    "/installation/:path*",
    "/concluded/:path*",
    "/admin/:path*",
    "/reports/:path*",
  ],
};
