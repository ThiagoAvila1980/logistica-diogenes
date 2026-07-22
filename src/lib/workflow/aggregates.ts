import type { OsStatus } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type {
  CuttingSteps,
  TransportSteps,
  InstallationSteps,
} from "@/lib/transport-gates";
import {
  isCuttingPhaseStatus,
  isInstallationPhaseStatus,
  isTransportPhaseStatus,
} from "@/lib/transport-gates";

/**
 * Funções puras de agregação de progresso por vão.
 *
 * Mantidas isoladas (sem dependência de banco, sessão ou React) para que
 * a lógica central do fluxo operacional seja testável em unidade.
 *
 * Semântica intencional:
 *   - "alguma" (some)  → libera operação paralela assim que o primeiro vão avança
 *   - "toda" (every)   → só conclui a etapa quando todos os vãos avançam
 */

/**
 * Progresso de corte a partir dos itens (vãos).
 *
 * - corteFeito      → ALGUM vão tem corte concluído (libera transporte em paralelo)
 * - embalagemFeita  → TODOS os vãos têm embalagem concluída
 * - acessoriosFeitos → TODOS os vãos têm acessórios concluídos
 * - vidrosFeitos    → TODOS os vãos têm vidros concluídos
 */
/** Vãos que entram no plano de corte (retrocompat: todos se nenhum tiver flag). */
export function selectCuttingLineItems(
  items: MeasurementLineItem[],
): MeasurementLineItem[] {
  const hasSentFlag = items.some((i) => i.sentToCutting === true);
  return hasSentFlag ? items.filter((i) => i.sentToCutting === true) : items;
}

/** Há algum vão com etapa de corte incompleta (checagem por vão, não por agregado). */
export function hasPendingCuttingWorkOnItems(
  items: MeasurementLineItem[],
): boolean {
  if (!items.length) return false;
  return items.some((item) => {
    const p = item.cuttingProgress;
    return (
      p?.corte !== true ||
      p?.embalagem !== true ||
      p?.acessorios !== true ||
      p?.vidros !== true
    );
  });
}

/** Cortador pode operar na fase de corte ou em transporte paralelo com vãos pendentes. */
export function canOperateCuttingForItems(
  status: OsStatus,
  items: MeasurementLineItem[],
): boolean {
  if (isCuttingPhaseStatus(status)) return true;
  if (!isTransportPhaseStatus(status)) return false;
  return hasPendingCuttingWorkOnItems(selectCuttingLineItems(items));
}

export function aggregateCuttingStepsFromItems(
  items: MeasurementLineItem[],
): CuttingSteps {
  if (!items.length) {
    return {
      corteFeito: false,
      embalagemFeita: false,
      acessoriosFeitos: false,
      vidrosFeitos: false,
    };
  }
  return {
    corteFeito: items.some((i) => i.cuttingProgress?.corte === true),
    embalagemFeita: items.every((i) => i.cuttingProgress?.embalagem === true),
    acessoriosFeitos: items.every((i) => i.cuttingProgress?.acessorios === true),
    vidrosFeitos: items.every((i) => i.cuttingProgress?.vidros === true),
  };
}

/**
 * Progresso de transporte a partir dos itens (vãos).
 *
 * - levarPerfilEstrutural → ALGUM vão entregou o perfil estrutural
 * - levarPerfilTotal      → TODOS os vãos entregaram os perfis (embalagem)
 * - levarAcessorios       → TODOS os vãos entregaram acessórios
 * - levarVidros           → TODOS os vãos entregaram vidros
 * - transporteConcluido   → as 4 entregas acima completas
 */
export function aggregateTransportStepsFromItems(
  items: MeasurementLineItem[],
): TransportSteps {
  if (!items.length) {
    return {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      levarVidros: false,
      transporteConcluido: false,
    };
  }

  const levarPerfilEstrutural = items.some(
    (i) => i.transportProgress?.perfilEstrutural === true,
  );
  const levarPerfilTotal = items.every(
    (i) => i.transportProgress?.perfilTotal === true,
  );
  const levarAcessorios = items.every(
    (i) => i.transportProgress?.acessorios === true,
  );
  const levarVidros = items.every((i) => i.transportProgress?.vidros === true);
  const transporteConcluido =
    levarPerfilEstrutural && levarPerfilTotal && levarAcessorios && levarVidros;

  return {
    levarPerfilEstrutural,
    levarPerfilTotal,
    levarAcessorios,
    levarVidros,
    transporteConcluido,
  };
}

/**
 * Vãos que entraram na instalação (retrocompat: todos se nenhum tiver progresso).
 */
export function selectInstallationLineItems(
  items: MeasurementLineItem[],
): MeasurementLineItem[] {
  const hasSent = items.some((i) => i.installationProgress !== undefined);
  return hasSent
    ? items.filter((i) => i.installationProgress !== undefined)
    : items;
}

/**
 * Progresso de instalação a partir dos itens (vãos).
 *
 * - instalacaoEstruturalFeita → TODOS os vãos têm estrutural concluído
 * - instalacaoVidrosFeita    → TODOS os vãos têm vidros concluídos
 */
export function isVaoInstallationStepsComplete(
  item: MeasurementLineItem,
): boolean {
  const progress = item.installationProgress;
  return (
    progress?.estrutural === true &&
    progress?.vidros === true &&
    progress?.acabamento === true
  );
}

export function isVaoInstallationConcluded(item: MeasurementLineItem): boolean {
  return item.installationProgress?.concluido === true;
}

export function aggregateInstallationStepsFromItems(
  items: MeasurementLineItem[],
): InstallationSteps {
  if (!items.length) {
    return { instalacaoEstruturalFeita: false, instalacaoVidrosFeita: false, instalacaoAcabamentoFeito: false };
  }
  return {
    instalacaoEstruturalFeita: items.every(
      (i) => i.installationProgress?.estrutural === true,
    ),
    instalacaoVidrosFeita: items.every(
      (i) => i.installationProgress?.vidros === true,
    ),
    instalacaoAcabamentoFeito: items.every(
      (i) => i.installationProgress?.acabamento === true,
    ),
  };
}

/** Todos os vãos foram confirmados como concluídos na instalação */
export function aggregateAllVaosInstallationConcluded(
  items: MeasurementLineItem[],
): boolean {
  if (!items.length) return false;
  return items.every(isVaoInstallationConcluded);
}

/**
 * A OS já passou da fase de corte (está em transporte/instalação/concluída)?
 * Quando verdadeiro, os módulos de transporte assumem o corte como concluído.
 */
export function isTransportOrLater(status: OsStatus): boolean {
  return isTransportPhaseStatus(status) || isInstallationPhaseStatus(status);
}

/**
 * A OS já está na fase de instalação (ou concluída)?
 * Quando verdadeiro, o módulo de instalação assume o corte como concluído.
 */
export function isInstallationOrLater(status: OsStatus): boolean {
  return isInstallationPhaseStatus(status);
}

/**
 * Aplica a regra "fase adiantada ⇒ corte considerado concluído".
 *
 * Substitui o trecho duplicado em várias actions:
 *   { corteFeito: agg.corteFeito || isLatePhase, ... }
 */
export function effectiveCuttingSteps(
  aggregate: CuttingSteps,
  assumeDone: boolean,
): CuttingSteps {
  if (!assumeDone) return aggregate;
  return {
    corteFeito: true,
    embalagemFeita: true,
    acessoriosFeitos: true,
    vidrosFeitos: true,
  };
}
