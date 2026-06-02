"use client";

import { useEffect, useState } from "react";

/**
 * Retorna `true` quando `isPending` está ativo por mais de `delayMs` ms.
 * Use para exibir uma mensagem de "aguardando servidor..." em operações longas.
 */
export function useSlowPending(isPending: boolean, delayMs = 5000): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setIsSlow(false);
      return;
    }

    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isPending, delayMs]);

  return isSlow;
}
