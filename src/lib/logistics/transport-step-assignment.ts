import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { TransportStep } from "./transport-item-gates";

export const TRANSPORT_STEPS: readonly TransportStep[] = [
  "perfilEstrutural",
  "perfilTotal",
  "acessorios",
  "vidros",
];

export const TRANSPORT_STEP_LABELS: Record<TransportStep, string> = {
  perfilEstrutural: "Perfil estrutural",
  perfilTotal: "Perfil total",
  acessorios: "Acessórios",
  vidros: "Vidros",
};

export type VaoStepAssignment = {
  driverId: string | null;
  scheduledDate: string | null;
  vehicleId: string | null;
};

/**
 * Motorista, data e veículo designados para um item de ticagem específico do vão.
 *
 * Vãos criados antes desta funcionalidade só tinham motorista/data/veículo no
 * nível do vão. Esse valor legado é usado como padrão inicial de TODOS os
 * itens até que cada um seja sobrescrito individualmente em `stepAssignments`.
 */
export function getVaoStepAssignment(
  item: Pick<MeasurementLineItem, "transportProgress">,
  step: TransportStep,
): VaoStepAssignment {
  const explicit = item.transportProgress?.stepAssignments?.[step];
  if (explicit) {
    return {
      driverId: explicit.driverId ?? null,
      scheduledDate: explicit.scheduledDate ?? null,
      // Dados antigos podem ter stepAssignments sem vehicleId — usa o legado do vão.
      vehicleId:
        "vehicleId" in explicit
          ? (explicit.vehicleId ?? null)
          : (item.transportProgress?.vehicleId ?? null),
    };
  }
  return {
    driverId: item.transportProgress?.driverId ?? null,
    scheduledDate: item.transportProgress?.scheduledTransportDate ?? null,
    vehicleId: item.transportProgress?.vehicleId ?? null,
  };
}

/** IDs de todos os motoristas designados em qualquer item de ticagem do vão (sem duplicatas). */
export function collectVaoStepDriverIds(
  item: Pick<MeasurementLineItem, "transportProgress">,
): string[] {
  const ids = new Set<string>();
  for (const step of TRANSPORT_STEPS) {
    const driverId = getVaoStepAssignment(item, step).driverId;
    if (driverId) ids.add(driverId);
  }
  return [...ids];
}
