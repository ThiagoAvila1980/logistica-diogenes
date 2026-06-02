"use client";

import { useState, useCallback } from "react";

type ActionFn<T> = () => Promise<{ success: boolean; message?: string } & T>;

type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
};

type RetryResult<T> = {
  run: () => Promise<({ success: boolean; message?: string } & T) | null>;
  isLoading: boolean;
  attempt: number;
};

/**
 * Executa uma action com retry automático em caso de falha de rede.
 * Distingue erros de rede (retenta) de erros de negócio (não retenta).
 */
export function useRetryAction<T extends object>(
  actionFn: ActionFn<T>,
  { maxAttempts = 2, delayMs = 800 }: RetryOptions = {},
): RetryResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const run = useCallback(async () => {
    setIsLoading(true);
    setAttempt(0);

    for (let i = 0; i < maxAttempts; i++) {
      setAttempt(i + 1);
      try {
        const result = await actionFn();
        setIsLoading(false);
        return result;
      } catch {
        // Erro de rede/servidor — retenta se ainda há tentativas
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    setIsLoading(false);
    return null;
  }, [actionFn, maxAttempts, delayMs]);

  return { run, isLoading, attempt };
}
