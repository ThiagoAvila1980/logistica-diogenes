/**
 * Gates de transporte: define quais sub-etapas estão desbloqueadas
 * com base nas cutting steps e no status atual da OS.
 *
 * Regras:
 *   levarPerfilEstrutural → corteFeito
 *   levarPerfilTotal      → embalagemFeita
 *   levarAcessorios       → acessoriosFeitos
 *   levarVidros           → vidrosFeitos
 *   transporteConcluido   → as 4 entregas anteriores concluídas
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
  return (TRANSPORT_PHASE_STATUSES as readonly OsStatus[]).includes(status);
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
    transport.levarVidros &&
    transport.transporteConcluido
  );
}

export function hasPendingCuttingSteps(cutting: CuttingSteps): boolean {
  return (
    !cutting.corteFeito ||
    !cutting.embalagemFeita ||
    !cutting.acessoriosFeitos ||
    !cutting.vidrosFeitos
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
  vidrosFeitos: boolean;
};

export type TransportSteps = {
  levarPerfilEstrutural: boolean;
  levarPerfilTotal: boolean;
  levarAcessorios: boolean;
  levarVidros: boolean;
  transporteConcluido: boolean;
};

export type InstallationSteps = {
  instalacaoEstruturalFeita: boolean;
  instalacaoVidrosFeita: boolean;
};

