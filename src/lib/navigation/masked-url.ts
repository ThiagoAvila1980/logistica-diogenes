export const APP_ROUTE_STORAGE_KEY = "app-route";
export const GOTO_QUERY_PARAM = "goto";

const INTERNAL_PATH_PREFIXES = [
  "/dashboard",
  "/field",
  "/production",
  "/logistics",
  "/installation",
  "/admin",
  "/login",
  "/unauthorized",
] as const;

export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.WEBAUTHN_ORIGIN ??
    "http://localhost:3000"
  );
}

/** Pathname sem query/hash, para validar prefixos internos. */
export function stripSearchAndHash(path: string): string {
  const withoutHash = path.split("#")[0] ?? path;
  return withoutHash.split("?")[0] ?? withoutHash;
}

export function isValidInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://")) return false;

  const pathOnly = stripSearchAndHash(path);
  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
}

/** Monta rota interna preservando filtros da query string. */
export function buildInternalRoute(pathname: string, search = ""): string {
  const pathOnly = stripSearchAndHash(pathname) || "/";
  const trimmed = search.trim();
  if (!trimmed || trimmed === "?") return pathOnly;
  const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
  return query ? `${pathOnly}?${query}` : pathOnly;
}

const PUBLIC_UNMASKED_PATHS = new Set(["/login", "/unauthorized"]);

export function isMaskablePath(pathname: string): boolean {
  const pathOnly = stripSearchAndHash(pathname);
  if (
    !pathOnly ||
    pathOnly.startsWith("/_next") ||
    pathOnly.startsWith("/api")
  ) {
    return false;
  }

  if (pathOnly === "/" || PUBLIC_UNMASKED_PATHS.has(pathOnly)) return false;

  return isValidInternalPath(pathOnly);
}

export function parseGotoParam(search: string): string | null {
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  const goto = new URLSearchParams(normalized).get(GOTO_QUERY_PARAM);
  if (!goto) return null;

  try {
    const decoded = decodeURIComponent(goto);
    return isValidInternalPath(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function buildAppUrl(internalPath: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  const path = internalPath.startsWith("/") ? internalPath : `/${internalPath}`;
  return `${base}/?${GOTO_QUERY_PARAM}=${encodeURIComponent(path)}`;
}

export function readStoredRoute(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(APP_ROUTE_STORAGE_KEY);
    return stored && isValidInternalPath(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredRoute(route: string): void {
  if (typeof window === "undefined") return;
  if (!isMaskablePath(stripSearchAndHash(route))) return;
  if (!isValidInternalPath(route)) return;

  try {
    sessionStorage.setItem(APP_ROUTE_STORAGE_KEY, route);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredRoute(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(APP_ROUTE_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function maskBrowserUrl(route: string, mode: "replace" | "push"): void {
  if (typeof window === "undefined") return;
  if (!isMaskablePath(stripSearchAndHash(route))) return;
  if (!isValidInternalPath(route)) return;

  const state = { internalPath: route };

  try {
    if (mode === "push") {
      window.history.pushState(state, "", "/");
      return;
    }

    window.history.replaceState(state, "", "/");
  } catch {
    /* WebViews (WhatsApp/Instagram) podem bloquear History API */
  }
}

/**
 * Com query ativa, mascarar para `/` faz o Next App Router navegar para
 * `/?filtros` e perder a rota real. Só mascara quando não há search.
 */
export function shouldMaskBrowserUrl(search: string): boolean {
  return !search.trim();
}
