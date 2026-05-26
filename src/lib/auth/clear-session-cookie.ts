import type { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-types";
import {
  getClearSessionCookieOptions,
  getSessionCookieOptions,
} from "@/lib/auth/session-cookie-options";

type CookieJar = {
  set: (
    name: string,
    value: string,
    options?: ReturnType<typeof getClearSessionCookieOptions>,
  ) => void;
  delete: (options: {
    name: string;
    path?: string;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  }) => void;
};

function buildClearSessionCookieHeader(secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Limpa o cookie de sessão com os mesmos atributos usados no login. */
export function clearSessionCookie(jar: CookieJar): void {
  const clearOptions = getClearSessionCookieOptions();
  jar.set(SESSION_COOKIE, "", clearOptions);
  jar.delete({
    name: SESSION_COOKIE,
    path: clearOptions.path,
    secure: clearOptions.secure,
    sameSite: clearOptions.sameSite,
  });
}

/** Header explícito — garante remoção do cookie HttpOnly no navegador. */
export function appendClearSessionCookieHeaders(response: NextResponse): void {
  const { secure } = getSessionCookieOptions();
  clearSessionCookie(response.cookies);
  response.headers.append("Set-Cookie", buildClearSessionCookieHeader(secure));
  if (!secure) {
    response.headers.append("Set-Cookie", buildClearSessionCookieHeader(true));
  }
  response.headers.set("Cache-Control", "no-store");
}
