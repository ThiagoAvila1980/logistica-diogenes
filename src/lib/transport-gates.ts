/**
 * Gates de transporte: define quais sub-etapas estão desbloqueadas
 * com base nas cutting steps e no status atual da OS.
 *
 * Regras:
 *   levarPerfilEstrutural → corteFeito
 *   levarPerfilTotal      → embalagemFeita
 *   levarAcessorios       → acessoriosFeitos
 *   transporteConcluido   → as 3 entregas anteriores concluídas
 */

import type { OsStatus } from "@/db/schema";

export const CUTTING_PHASE_STATUSES = [
  "cortes",
  "embalagem",
  "acessorios_plano",
] as const satisfies readonly OsStatus[];

export const TRANSPORT_PHASE_STATUSES = [
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
] as const satisfies readonly OsStatus[];

export const INSTALLATION_PHASE_STATUSES = [
  "instalacao_estrutural",
  "instalacao_vidros",
  "concluido",
] as const satisfies readonly OsStatus[];

export function isCuttingPhaseStatus(status: OsStatus): boolean {
  return (CUTTING_PHASE_STATUSES as readonly OsStatus[]).includes(status);
}

export function isTransportPhaseStatus(status: OsStatus): boolean {
  return status.startsWith("transporte_");
}

export function isInstallationPhaseStatus(status: OsStatus): boolean {
  return (
    status.startsWith("instalacao") ||
    status === "concluido"
  );
}

/** Motorista pode operar transporte durante corte (após corte feito) e instalação paralela */
export function canOperateTransportModule(
  status: OsStatus,
  cutting: CuttingSteps,
): boolean {
  if (isTransportPhaseStatus(status)) return true;
  if (isInstallationPhaseStatus(status)) return true;
  return isCuttingPhaseStatus(status) && cutting.corteFeito;
}

/** Instalador pode operar após o corte estrutural ser concluído */
export function canOperateInstallationModule(
  status: OsStatus,
  cutting: CuttingSteps,
): boolean {
  if (isInstallationPhaseStatus(status)) return true;
  if (isTransportPhaseStatus(status) && cutting.corteFeito) return true;
  return isCuttingPhaseStatus(status) && cutting.corteFeito;
}

export function isTransportFullyDone(transport: TransportSteps): boolean {
  return (
    transport.levarPerfilEstrutural &&
    transport.levarPerfilTotal &&
    transport.levarAcessorios &&
    transport.transporteConcluido
  );
}

export function hasPendingCuttingSteps(cutting: CuttingSteps): boolean {
  return (
    !cutting.corteFeito ||
    !cutting.embalagemFeita ||
    !cutting.acessoriosFeitos
  );
}

/** Cortador pode continuar embalagem/acessórios mesmo após liberar transporte */
export function canOperateCuttingModule(
  status: OsStatus,
  cutting: CuttingSteps,
): boolean {
  if (isCuttingPhaseStatus(status)) return true;
  return isTransportPhaseStatus(status) && hasPendingCuttingSteps(cutting);
}

export type CuttingSteps = {
  corteFeito: boolean;
  embalagemFeita: boolean;
  acessoriosFeitos: boolean;
};

export type TransportSteps = {
  levarPerfilEstrutural: boolean;
  levarPerfilTotal: boolean;
  levarAcessorios: boolean;
  transporteConcluido: boolean;
};

export type InstallationSteps = {
  instalacaoEstruturalFeita: boolean;
  instalacaoVidrosFeita: boolean;
};

export type TransportGate = {
  unlocked: boolean;
  /** Descrição do pré-requisito quando bloqueado */
  lockedReason: string | null;
};

export type TransportGates = {
  levarPerfilEstrutural: TransportGate;
  levarPerfilTotal: TransportGate;
  levarAcessorios: TransportGate;
  transporteConcluido: TransportGate;
};

/** Sub-etapas exibidas no checklist operacional de transporte */
export type TransportChecklistStep = keyof TransportSteps;

export type InstallationGate = {
  unlocked: boolean;
  lockedReason: string | null;
};

export type InstallationGates = {
  instalacaoEstrutural: InstallationGate;
  instalacaoVidros: InstallationGate;
};

export type TransportGateOptions = {
  /** Veículo atribuído ao transporte — obrigatório para a 1ª entrega */
  hasVehicle?: boolean;
};

export function getTransportGates(
  cutting: CuttingSteps,
  transport: TransportSteps,
  options?: TransportGateOptions,
): TransportGates {
  const hasVehicle = options?.hasVehicle ?? false;
  const perfilOk = cutting.corteFeito;
  const totalOk = cutting.embalagemFeita;
  const acessoriosOk = cutting.acessoriosFeitos;

  const deliveriesDone =
    transport.levarPerfilEstrutural &&
    transport.levarPerfilTotal &&
    transport.levarAcessorios;

  return {
    levarPerfilEstrutural: {
      unlocked: perfilOk && hasVehicle,
      lockedReason: !perfilOk
        ? "Aguardando corte ser concluído"
        : !hasVehicle
          ? "Selecione o veículo antes de iniciar a entrega"
          : null,
    },
    levarPerfilTotal: {
      unlocked: totalOk,
      lockedReason: totalOk ? null : "Aguardando embalagem ser concluída",
    },
    levarAcessorios: {
      unlocked: acessoriosOk,
      lockedReason: acessoriosOk ? null : "Aguardando acessórios serem separados",
    },
    transporteConcluido: {
      unlocked: deliveriesDone,
      lockedReason: deliveriesDone
        ? null
        : "Todas as entregas anteriores devem ser concluídas",
    },
  };
}

export function getInstallationGates(
  transport: TransportSteps,
  cutting: CuttingSteps,
): InstallationGates {
  const estruturalOk = cutting.corteFeito;
  const vidrosOk = cutting.acessoriosFeitos || transport.levarAcessorios;

  return {
    instalacaoEstrutural: {
      unlocked: estruturalOk,
      lockedReason: estruturalOk
        ? null
        : "Aguardando conclusão do corte estrutural",
    },
    instalacaoVidros: {
      unlocked: vidrosOk,
      lockedReason: vidrosOk
        ? null
        : "Aguardando separação dos acessórios ou entrega na obra",
    },
  };
}
