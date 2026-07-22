"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildInternalRoute,
  isMaskablePath,
  maskBrowserUrl,
  shouldMaskBrowserUrl,
  writeStoredRoute,
} from "@/lib/navigation/masked-url";

type HistoryState = {
  internalPath?: string;
};

/**
 * Mascarar a URL para `/` via history.replaceState faz o App Router do Next
 * interpretar navegação para `/` e **carregar a query na home**
 * (ex.: `/?actorId=…`), perdendo a página real. Por isso:
 * - com query string ativa → não mascara (mantém `/rota?filtros`)
 * - sem query e já em `/` → só atualiza o state
 * - sem query e URL real visível → mascara para `/`
 */
export function UrlMaskProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeRef = useRef(buildInternalRoute(pathname, searchParams.toString()));
  const handlingPopstateRef = useRef(false);
  const lastBrowserPathRef = useRef<string | null>(null);

  const search = searchParams.toString();
  const internalRoute = buildInternalRoute(pathname, search);

  useEffect(() => {
    routeRef.current = internalRoute;
  }, [internalRoute]);

  useEffect(() => {
    if (!isMaskablePath(pathname)) return;

    writeStoredRoute(internalRoute);

    if (handlingPopstateRef.current) {
      handlingPopstateRef.current = false;
      if (shouldMaskBrowserUrl(search)) {
        maskBrowserUrl(internalRoute, "replace");
        lastBrowserPathRef.current = "/";
      }
      return;
    }

    const browserPath = window.location.pathname;

    // Filtros na query: mascarar para `/` faz o Next pedir `/?actorId=…`
    // e a home redireciona de volta sem filtros. Deixe a URL real visível.
    if (!shouldMaskBrowserUrl(search)) {
      lastBrowserPathRef.current = browserPath;
      return;
    }

    // Já mascarada: só sincroniza o state interno (sem mudar a URL de novo).
    if (browserPath === "/") {
      try {
        const state = window.history.state as HistoryState | null;
        if (state?.internalPath !== internalRoute) {
          window.history.replaceState({ internalPath: internalRoute }, "", "/");
        }
      } catch {
        /* WebView */
      }
      lastBrowserPathRef.current = "/";
      return;
    }

    const shouldPush =
      lastBrowserPathRef.current === "/" &&
      window.history.state?.internalPath !== internalRoute;

    maskBrowserUrl(internalRoute, shouldPush ? "push" : "replace");
    lastBrowserPathRef.current = "/";
  }, [pathname, internalRoute, search]);

  useEffect(() => {
    const onPopstate = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      const internalPath = state?.internalPath;

      if (!internalPath || internalPath === routeRef.current) {
        return;
      }

      handlingPopstateRef.current = true;
      router.push(internalPath);
    };

    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, [router]);

  return children;
}
