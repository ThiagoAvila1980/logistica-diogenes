import type { OsStatus } from "@/db/schema";
import { getPrimaryNextStatusForFlow } from "@/lib/workflow/measurement-flow";

export type KanbanPhase = {
  id: string;
  title: string;
  /** Rótulo curto para colunas estreitas (mobile) */
  shortTitle: string;
  statuses: readonly OsStatus[];
};

/** 4 colunas do Kanban — cards agrupados por fase; sub-status no card */
export const KANBAN_PHASES: readonly KanbanPhase[] = [
  {
    id: "medicao",
    title: "MEDIÇÃO",
    shortTitle: "Medição",
    statuses: ["medicao_orcamento", "medicao_final"],
  },
  {
    id: "plano_corte",
    title: "PLANO DE CORTE",
    shortTitle: "Corte",
    statuses: ["cortes", "embalagem", "acessorios_plano"],
  },
  {
    id: "transporte",
    title: "TRANSPORTE",
    shortTitle: "Transp.",
    statuses: [
      "transporte_perfil",
      "transporte_estrutural",
      "transporte_perfis_total",
      "transporte_acessorios",
      "transporte_levar_vidro",
    ],
  },
  {
    id: "instalacao",
    title: "INSTALAÇÃO",
    shortTitle: "Inst.",
    statuses: ["instalacao_estrutural", "instalacao_vidros", "concluido"],
  },
] as const;

/** Todos os sub-status visíveis no Kanban (ordem do pipeline) */
export const KANBAN_PIPELINE_STATUSES: OsStatus[] = KANBAN_PHASES.flatMap(
  (phase) => [...phase.statuses],
);

/**
 * Normaliza o status para o pipeline do Kanban.
 *
 * Os status legados foram removidos do enum (migration 0027); esta função
 * permanece como identidade para preservar a assinatura dos chamadores e
 * facilitar futuros remapeamentos, caso necessário.
 */
export function normalizeKanbanStatus(status: OsStatus): OsStatus {
  return status;
}

export function getKanbanPhaseForStatus(status: OsStatus): KanbanPhase | null {
  const normalized = normalizeKanbanStatus(status);
  return (
    KANBAN_PHASES.find((phase) => phase.statuses.includes(normalized)) ?? null
  );
}

export function isKanbanPipelineStatus(status: OsStatus): boolean {
  return KANBAN_PIPELINE_STATUSES.includes(normalizeKanbanStatus(status));
}

export function getPhaseIdForStatus(status: OsStatus): string | null {
  return getKanbanPhaseForStatus(status)?.id ?? null;
}

/**
 * Ao soltar um card na coluna da fase adjacente à frente,
 * retorna o próximo sub-status permitido (se cair nessa fase).
 */
export function resolvePhaseDropTarget(
  fromStatus: OsStatus,
  toPhaseId: string,
): OsStatus | null {
  const normalized = normalizeKanbanStatus(fromStatus);
  const fromPhase = getKanbanPhaseForStatus(normalized);
  const toPhase = KANBAN_PHASES.find((p) => p.id === toPhaseId);

  if (!fromPhase || !toPhase || fromPhase.id === toPhase.id) return null;

  const fromIdx = KANBAN_PHASES.findIndex((p) => p.id === fromPhase.id);
  const toIdx = KANBAN_PHASES.findIndex((p) => p.id === toPhaseId);

  if (toIdx !== fromIdx + 1) return null;

  const next = getPrimaryNextStatusForFlow(normalized);
  if (!next || !toPhase.statuses.includes(next)) return null;

  return next;
}
