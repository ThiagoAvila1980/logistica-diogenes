/** Opções do cookie de sessão — centralizadas para dev/prod/Coolify. */
export function getSessionCookieOptions() {
  const secure =
    process.env.COOKIE_SECURE === "true"
      ? true
      : process.env.COOKIE_SECURE === "false"
        ? false
        : process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true ||
          process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** Prefetch do App Router pode rodar sem cookies; redirecionar quebra a navegação. */
export function isAuthPrefetchRequest(request: Request): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  );
}
