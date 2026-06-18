"use client";

import { useEffect } from "react";

/** Registra o Service Worker do Serwist no navegador */
export function SwRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] Falha ao registrar:", err));
    }
  }, []);

  return null;
}
