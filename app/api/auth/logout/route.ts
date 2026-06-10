import { NextRequest, NextResponse } from "next/server";
import { appendClearSessionCookieHeaders } from "@/lib/auth/clear-session-cookie";

export const dynamic = "force-dynamic";

function logoutResponse(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  const loginUrl = new URL("/login", `${proto}://${host}`);
  loginUrl.searchParams.set("signedOut", "1");
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  appendClearSessionCookieHeaders(response);
  return response;
}

export function GET(request: NextRequest) {
  return logoutResponse(request);
}

export function POST(request: NextRequest) {
  return logoutResponse(request);
}
