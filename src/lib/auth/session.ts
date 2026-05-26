import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { clearSessionCookie } from "@/lib/auth/clear-session-cookie";
import { getSessionCookieOptions } from "./session-cookie-options";
import { parseSession, signSession } from "./session-cookie";
import { SESSION_COOKIE, type SessionUser } from "./session-types";

export async function getSession(): Promise<SessionUser | null> {
  noStore();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return parseSession(token);
}

export async function setSession(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(user), getSessionCookieOptions());
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  clearSessionCookie(jar);
}

export type { SessionUser };
