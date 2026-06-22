import { cookies } from "next/headers";
import { getSessionCookieOptions } from "@/lib/auth/session-cookie-options";
import {
  PWA_PROMPT_COOKIE,
  PWA_PROMPT_MAX_AGE_SECONDS,
} from "@/lib/pwa/pwa-prompt-cookie.client";

export { PWA_PROMPT_COOKIE } from "@/lib/pwa/pwa-prompt-cookie.client";

function getPwaPromptCookieOptions() {
  const { secure, sameSite, path } = getSessionCookieOptions();
  return {
    httpOnly: false,
    sameSite,
    secure,
    path,
    maxAge: PWA_PROMPT_MAX_AGE_SECONDS,
  };
}

/** Marca que o usuário acabou de logar e ainda não viu o prompt nesta sessão. */
export async function setPwaPromptPendingCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(PWA_PROMPT_COOKIE, "1", getPwaPromptCookieOptions());
}
