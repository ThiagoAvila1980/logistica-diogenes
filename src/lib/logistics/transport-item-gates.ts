import type { OsStatus } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  isInstallationPhaseStatus,
  isTransportPhaseStatus,
} from "@/lib/transport-gates";

export type TransportStep = "perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros";

export type TransportStepGate = { unlocked: boolean; reason: string | null };

function isTransportOrLater(status: OsStatus | string): boolean {
  const osStatus = status as OsStatus;
  return isTransportPhaseStatus(osStatus) || isInstallationPhaseStatus(osStatus);
}

/**
 * Retorna quais etapas de transporte estão desbloqueadas para um vão,
 * baseado no progresso de corte daquele vão e na fase atual da OS.
 *
 * Alinhado com `updateItemTransportStepAction` (usa `isTransportOrLater`).
 * Perfil estrutural libera após o corte; veículo é validado ao marcar.
 */
export function getItemTransportGates(
  item: MeasurementLineItem,
  osStatus: OsStatus | string,
  hasVehicle: boolean,
): Record<TransportStep, TransportStepGate> {
  const isLatePhase = isTransportOrLater(osStatus as OsStatus);
  const cut = item.cuttingProgress ?? {
    corte: false,
    embalagem: false,
    acessorios: false,
    vidros: false,
  };

  const corteOk = cut.corte || isLatePhase;
  const embalagemOk = cut.embalagem || isLatePhase;
  const acessoriosOk = cut.acessorios || isLatePhase;
  const vidrosOk = cut.vidros || isLatePhase;

  return {
    perfilEstrutural: {
      unlocked: corteOk,
      reason: !corteOk
        ? "Aguardando corte deste vão"
        : !hasVehicle
          ? "Selecione um veículo para iniciar a entrega do perfil estrutural"
          : null,
    },
    perfilTotal: {
      unlocked: embalagemOk,
      reason: embalagemOk ? null : "Aguardando embalagem deste vão",
    },
    acessorios: {
      unlocked: acessoriosOk,
      reason: acessoriosOk ? null : "Aguardando acessórios deste vão",
    },
    vidros: {
      unlocked: vidrosOk,
      reason: vidrosOk ? null : "Aguardando vidros deste vão",
    },
  };
}
