"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isMaskablePath,
  maskBrowserUrl,
  writeStoredRoute,
} from "@/lib/navigation/masked-url";

type HistoryState = {
  internalPath?: string;
};

export function UrlMaskProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const handlingPopstateRef = useRef(false);
  const lastBrowserPathRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isMaskablePath(pathname)) return;

    writeStoredRoute(pathname);

    if (handlingPopstateRef.current) {
      handlingPopstateRef.current = false;
      maskBrowserUrl(pathname, "replace");
      lastBrowserPathRef.current = "/";
      return;
    }

    const browserPath = window.location.pathname;
    const shouldPush =
      browserPath === "/" &&
      lastBrowserPathRef.current === "/" &&
      window.history.state?.internalPath !== pathname;

    maskBrowserUrl(pathname, shouldPush ? "push" : "replace");
    lastBrowserPathRef.current = "/";
  }, [pathname]);

  useEffect(() => {
    const onPopstate = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      const internalPath = state?.internalPath;

      if (!internalPath || internalPath === pathnameRef.current) {
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
