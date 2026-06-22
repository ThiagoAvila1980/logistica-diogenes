/** Cookie de curta duração — sinaliza que o prompt PWA deve rodar após o login. */
export const PWA_PROMPT_COOKIE = "pwa_prompt_pending";

export const PWA_PROMPT_MAX_AGE_SECONDS = 120;

/** Lê e remove o cookie no cliente (uso único por login). */
export function consumePwaPromptCookie(): boolean {
  if (typeof document === "undefined") return false;

  const found = document.cookie
    .split("; ")
    .some((entry) => entry === `${PWA_PROMPT_COOKIE}=1`);

  if (!found) return false;

  document.cookie = `${PWA_PROMPT_COOKIE}=; path=/; max-age=0`;
  return true;
}
