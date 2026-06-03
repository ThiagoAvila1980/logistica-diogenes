"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ActionSuccessState = { success: true; message: string } | null | undefined;

/**
 * Executa side-effects (ex.: router.refresh) uma única vez por resultado de
 * useActionState com success — evita loop quando success permanece true após refresh.
 */
export function useRunOnceOnActionSuccess(
  state: ActionSuccessState | { success: false; message: string } | null,
  onSuccess: () => void,
  options?: { refresh?: boolean },
) {
  const router = useRouter();
  const handledRef = useRef<typeof state>(null);
  const refresh = options?.refresh ?? true;

  useEffect(() => {
    if (!state?.success) return;
    if (handledRef.current === state) return;
    handledRef.current = state;
    onSuccess();
    if (refresh) {
      router.refresh();
    }
  }, [state, onSuccess, refresh, router]);
}
