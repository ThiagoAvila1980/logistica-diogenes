"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session-types";
import { getDefaultRouteForRoles } from "@/lib/auth/permissions";
import {
  parseGotoParam,
  readStoredRoute,
  writeStoredRoute,
} from "@/lib/navigation/masked-url";

type RouteBootstrapProps = {
  session: SessionUser | null;
};

export function RouteBootstrap({ session }: RouteBootstrapProps) {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const goto = parseGotoParam(window.location.search);

    if (goto) {
      window.history.replaceState(null, "", "/");

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(goto)}`);
        return;
      }

      writeStoredRoute(goto);
      router.replace(goto);
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    const storedRoute = readStoredRoute();
    if (storedRoute) {
      router.replace(storedRoute);
      return;
    }

    router.replace(getDefaultRouteForRoles(session.roles));
  }, [router, session]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}
