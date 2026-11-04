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
import {
  cuttingStepApplies,
  installationStepApplies,
  transportStepApplies,
} from "@/lib/workflow/espelho-vao";

const NO_ESPELHO_TIPOS: ReadonlySet<string> = new Set();

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
 * - corteFeito      → ALGUM vão que precisa de corte o concluiu.
 *   Se nenhum vão precisa (só espelho), a etapa não bloqueia.
 * - embalagemFeita  → TODOS os vãos que precisam de embalagem a concluíram
 * - acessoriosFeitos → TODOS os vãos que precisam de acessórios os concluíram
 * - vidrosFeitos    → TODOS os vãos têm vidros concluídos
 * Vão de espelho só entra em vidros.
 */
/** Vãos que entram no plano de corte (retrocompat: todos se nenhum tiver flag). */
export function selectCuttingLineItems(
  items: MeasurementLineItem[],
): MeasurementLineItem[] {
  const hasSentFlag = items.some((i) => i.sentToCutting === true);
  return hasSentFlag ? items.filter((i) => i.sentToCutting === true) : items;
}

/**
 * Vãos que ainda não foram enviados ao corte (permanecem editáveis na medição).
 * Retrocompat: se nenhum tiver `sentToCutting`, todos ainda estão na medição.
 */
export function selectUnsentMeasurementLineItems(
  items: MeasurementLineItem[],
): MeasurementLineItem[] {
  const hasSentFlag = items.some((i) => i.sentToCutting === true);
  if (!hasSentFlag) return items;
  return items.filter((i) => i.sentToCutting !== true);
}

/**
 * Há envio parcial: pelo menos um vão no corte e pelo menos um ainda na medição.
 */
export function hasRemainingUnsentMeasurementItems(
  items: MeasurementLineItem[],
): boolean {
  const hasSent = items.some((i) => i.sentToCutting === true);
  if (!hasSent) return false;
  return items.some((i) => i.sentToCutting !== true);
}

function cuttingStepSatisfied(
  item: MeasurementLineItem,
  step: "corte" | "embalagem" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  if (!cuttingStepApplies(item, step, espelhoTipoIds)) return true;
  return item.cuttingProgress?.[step] === true;
}

/** Etapa "algum vão" fica satisfeita quando nenhum vão precisa dela. */
function someApplicableCuttingStep(
  items: MeasurementLineItem[],
  step: "corte" | "embalagem" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  const relevant = items.filter((item) =>
    cuttingStepApplies(item, step, espelhoTipoIds),
  );
  if (relevant.length === 0) return items.length > 0;
  return relevant.some((item) => item.cuttingProgress?.[step] === true);
}

/** Há algum vão com etapa de corte incompleta (checagem por vão, não por agregado). */
export function hasPendingCuttingWorkOnItems(
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): boolean {
  if (!items.length) return false;
  return items.some(
    (item) =>
      !cuttingStepSatisfied(item, "corte", espelhoTipoIds) ||
      !cuttingStepSatisfied(item, "embalagem", espelhoTipoIds) ||
      !cuttingStepSatisfied(item, "acessorios", espelhoTipoIds) ||
      !cuttingStepSatisfied(item, "vidros", espelhoTipoIds),
  );
}

/**
 * O plano de corte continua mostrando a OS enquanto algum vão enviado
 * ainda tem etapa de corte pendente, mesmo que outro vão já tenha
 * levado a OS para transporte, instalação ou concluído.
 */
export function shouldListOrderInCutting(
  status: OsStatus,
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): boolean {
  const cuttingItems = selectCuttingLineItems(items);
  const pending = hasPendingCuttingWorkOnItems(cuttingItems, espelhoTipoIds);
  if (!pending) {
    return cuttingItems.length === 0 && isCuttingPhaseStatus(status);
  }
  return (
    isCuttingPhaseStatus(status) ||
    isTransportPhaseStatus(status) ||
    isInstallationPhaseStatus(status)
  );
}

/** Cortador pode operar na fase de corte ou enquanto ainda houver vão pendente. */
export function canOperateCuttingForItems(
  status: OsStatus,
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): boolean {
  if (isCuttingPhaseStatus(status)) return true;
  if (!isTransportPhaseStatus(status) && !isInstallationPhaseStatus(status)) {
    return false;
  }
  return hasPendingCuttingWorkOnItems(
    selectCuttingLineItems(items),
    espelhoTipoIds,
  );
}

export function aggregateCuttingStepsFromItems(
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
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
    corteFeito: someApplicableCuttingStep(items, "corte", espelhoTipoIds),
    embalagemFeita: items.every((item) =>
      cuttingStepSatisfied(item, "embalagem", espelhoTipoIds),
    ),
    acessoriosFeitos: items.every((item) =>
      cuttingStepSatisfied(item, "acessorios", espelhoTipoIds),
    ),
    vidrosFeitos: items.every((item) =>
      cuttingStepSatisfied(item, "vidros", espelhoTipoIds),
    ),
  };
}

/**
 * Progresso de transporte a partir dos itens (vãos).
 *
 * Considera apenas vãos do plano de corte (mesma regra de `selectCuttingLineItems`),
 * para que vãos só medidos não impeçam o transporte de ser concluído.
 *
 * - levarPerfilEstrutural → ALGUM vão que leva perfil estrutural o entregou
 * - levarPerfilTotal      → TODOS os vãos que levam perfil total o entregaram
 * - levarAcessorios       → TODOS os vãos que levam acessórios os entregaram
 * - levarVidros           → TODOS os vãos entregaram vidros
 * - transporteConcluido   → as entregas aplicáveis acima completas
 * Vão de espelho só entra em vidros.
 */
function transportStepSatisfied(
  item: MeasurementLineItem,
  step: "perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  if (!transportStepApplies(item, step, espelhoTipoIds)) return true;
  return item.transportProgress?.[step] === true;
}

function someApplicableTransportStep(
  items: MeasurementLineItem[],
  step: "perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  const relevant = items.filter((item) =>
    transportStepApplies(item, step, espelhoTipoIds),
  );
  if (relevant.length === 0) return items.length > 0;
  return relevant.some((item) => item.transportProgress?.[step] === true);
}

export function aggregateTransportStepsFromItems(
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): TransportSteps {
  const scoped = selectCuttingLineItems(items);
  if (!scoped.length) {
    return {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      levarVidros: false,
      transporteConcluido: false,
    };
  }

  const levarPerfilEstrutural = someApplicableTransportStep(
    scoped,
    "perfilEstrutural",
    espelhoTipoIds,
  );
  const levarPerfilTotal = scoped.every((item) =>
    transportStepSatisfied(item, "perfilTotal", espelhoTipoIds),
  );
  const levarAcessorios = scoped.every((item) =>
    transportStepSatisfied(item, "acessorios", espelhoTipoIds),
  );
  const levarVidros = scoped.every((item) =>
    transportStepSatisfied(item, "vidros", espelhoTipoIds),
  );
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
 * Considera apenas vãos enviados à instalação (`selectInstallationLineItems`).
 *
 * - instalacaoEstruturalFeita → TODOS os vãos que têm estrutural o concluíram
 * - instalacaoVidrosFeita    → TODOS os vãos têm vidros concluídos
 * Vão de espelho não exige estrutural.
 */
export function isVaoInstallationStepsComplete(
  item: MeasurementLineItem,
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): boolean {
  const progress = item.installationProgress;
  const estrutural =
    !installationStepApplies(item, "estrutural", espelhoTipoIds) ||
    progress?.estrutural === true;
  return (
    estrutural &&
    progress?.vidros === true &&
    progress?.acabamento === true
  );
}

export function isVaoInstallationConcluded(item: MeasurementLineItem): boolean {
  return item.installationProgress?.concluido === true;
}

export function aggregateInstallationStepsFromItems(
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): InstallationSteps {
  const scoped = selectInstallationLineItems(items);
  if (!scoped.length) {
    return { instalacaoEstruturalFeita: false, instalacaoVidrosFeita: false, instalacaoAcabamentoFeito: false };
  }
  return {
    instalacaoEstruturalFeita: scoped.every(
      (item) =>
        !installationStepApplies(item, "estrutural", espelhoTipoIds) ||
        item.installationProgress?.estrutural === true,
    ),
    instalacaoVidrosFeita: scoped.every(
      (i) => i.installationProgress?.vidros === true,
    ),
    instalacaoAcabamentoFeito: scoped.every(
      (i) => i.installationProgress?.acabamento === true,
    ),
  };
}

/** Todos os vãos enviados à instalação foram confirmados como concluídos */
export function aggregateAllVaosInstallationConcluded(
  items: MeasurementLineItem[],
): boolean {
  const scoped = selectInstallationLineItems(items);
  if (!scoped.length) return false;
  return scoped.every(isVaoInstallationConcluded);
}

/**
 * A OS só pode fechar quando cada vão foi confirmado na instalação.
 * Vão ainda na medição, no corte ou no transporte não entra em
 * `selectInstallationLineItems` e por isso não pode ser ignorado aqui.
 */
export function aggregateEveryItemInstallationConcluded(
  items: MeasurementLineItem[],
): boolean {
  if (!items.length) return false;
  return items.every(isVaoInstallationConcluded);
}

function itemCuttingComplete(
  item: MeasurementLineItem,
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  return (
    cuttingStepSatisfied(item, "corte", espelhoTipoIds) &&
    cuttingStepSatisfied(item, "embalagem", espelhoTipoIds) &&
    cuttingStepSatisfied(item, "acessorios", espelhoTipoIds) &&
    cuttingStepSatisfied(item, "vidros", espelhoTipoIds)
  );
}

function itemTransportComplete(
  item: MeasurementLineItem,
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  return (
    transportStepSatisfied(item, "perfilEstrutural", espelhoTipoIds) &&
    transportStepSatisfied(item, "perfilTotal", espelhoTipoIds) &&
    transportStepSatisfied(item, "acessorios", espelhoTipoIds) &&
    transportStepSatisfied(item, "vidros", espelhoTipoIds)
  );
}

/**
 * Trabalho que ainda pertence ao transporte: vão já cortado com entrega
 * pendente, ou corte pronto e ainda não enviado à instalação.
 * Vão que nem foi cortado fica no plano de corte, não aqui.
 */
export function hasPendingLogisticsWorkOnItems(
  items: MeasurementLineItem[],
  espelhoTipoIds: ReadonlySet<string> = NO_ESPELHO_TIPOS,
): boolean {
  return selectCuttingLineItems(items).some((item) => {
    if (!itemCuttingComplete(item, espelhoTipoIds)) return false;
    if (!itemTransportComplete(item, espelhoTipoIds)) return true;
    return item.installationProgress == null;
  });
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
