"use client";

import { useEffect } from "react";
import { registerAutoSync } from "@/lib/offline/sync-engine";

/**
 * Garante que o motor de auto-sync esteja ativo em qualquer tela do
 * dashboard, não só quando o formulário de medição está montado.
 */
export function AutoSyncRegistrar() {
  useEffect(() => {
    registerAutoSync();
  }, []);

  return null;
}
