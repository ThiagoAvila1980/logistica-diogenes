"use server";

import type { OsStatus } from "@/db/schema";
import { ADVANCE_TARGET_STATUSES } from "@/lib/workflow/advance-flow";
import type { AdvanceFormState } from "@/lib/workflow/advance-form-state";
import { advanceOSStatus } from "./os-actions";

export type { AdvanceFormState } from "@/lib/workflow/advance-form-state";

/**
 * Server Action para useActionState / useFormState.
 * Campos do FormData: osId, nextStatus, payload (JSON opcional)
 */
export async function advanceOSStatusFormAction(
  _prevState: AdvanceFormState,
  formData: FormData,
): Promise<AdvanceFormState> {
  const osId = formData.get("osId");
  const nextStatus = formData.get("nextStatus");
  const payloadRaw = formData.get("payload");

  if (typeof osId !== "string" || typeof nextStatus !== "string") {
    return {
      ..._prevState,
      success: false,
      message: "Formulário inválido",
    };
  }

  if (
    !ADVANCE_TARGET_STATUSES.includes(
      nextStatus as (typeof ADVANCE_TARGET_STATUSES)[number],
    )
  ) {
    return {
      ..._prevState,
      success: false,
      message: "Status de destino inválido",
    };
  }

  let payload: Record<string, unknown> | undefined;
  if (typeof payloadRaw === "string" && payloadRaw.trim()) {
    try {
      payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    } catch {
      return {
        ..._prevState,
        success: false,
        message: "Payload JSON inválido",
      };
    }
  }

  const result = await advanceOSStatus({
    osId,
    nextStatus: nextStatus as (typeof ADVANCE_TARGET_STATUSES)[number],
    payload,
  });

  if (!result.success) {
    return {
      success: false,
      message: result.message,
      status: _prevState.status,
    };
  }

  return {
    success: true,
    message: result.message,
    status: result.newStatus,
  };
}
