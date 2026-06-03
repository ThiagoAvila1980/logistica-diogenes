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

export function isValidInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://")) return false;

  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

const PUBLIC_UNMASKED_PATHS = new Set(["/login", "/unauthorized"]);

export function isMaskablePath(pathname: string): boolean {
  if (
    !pathname ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return false;
  }

  if (pathname === "/" || PUBLIC_UNMASKED_PATHS.has(pathname)) return false;

  return isValidInternalPath(pathname);
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

export function writeStoredRoute(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!isMaskablePath(pathname)) return;

  try {
    sessionStorage.setItem(APP_ROUTE_STORAGE_KEY, pathname);
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

export function maskBrowserUrl(pathname: string, mode: "replace" | "push"): void {
  if (typeof window === "undefined") return;
  if (!isMaskablePath(pathname)) return;

  const state = { internalPath: pathname };

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
