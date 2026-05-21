"use client";

import { useState, useTransition, useCallback } from "react";
import {
  advanceOSStatus,
  type AdvanceOSResult,
} from "@/actions/os-actions";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";

type AdvanceOptions = {
  onSuccess?: (res: Extract<AdvanceOSResult, { success: true }>) => void;
  onError?: (res: Extract<AdvanceOSResult, { success: false }>) => void;
};

export function useOSAdvance() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AdvanceOSResult | null>(null);

  const advance = useCallback(
    (
      osId: string,
      nextStatus: AdvanceTargetStatus,
      payload?: Record<string, unknown>,
      options?: AdvanceOptions,
    ) => {
      setResult(null);
      startTransition(async () => {
        const res = await advanceOSStatus({ osId, nextStatus, payload });
        setResult(res);
        if (res.success) {
          options?.onSuccess?.(res);
        } else {
          options?.onError?.(res);
        }
      });
    },
    [],
  );

  return {
    advance,
    isLoading: isPending,
    result,
    clearResult: () => setResult(null),
  };
}
