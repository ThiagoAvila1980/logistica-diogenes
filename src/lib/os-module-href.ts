/** Módulo operacional de cada coluna do kanban (independente do status da OS). */
const KANBAN_PHASE_MODULE_PATH: Record<string, string> = {
  medicao: "/field",
  plano_corte: "/production",
  transporte: "/logistics",
  instalacao: "/installation",
  concluidos: "/installation",
};

/**
 * Base path do módulo operacional para uma OS, conforme etapa atual.
 */
export function getOsModuleBasePath(status: string): string {
  if (status.startsWith("medicao")) {
    return "/field";
  }
  if (
    status === "cortes" ||
    status === "embalagem" ||
    status === "acessorios_plano"
  ) {
    return "/production";
  }
  if (status.startsWith("transporte_")) {
    return "/logistics";
  }
  if (
    status.startsWith("instalacao") ||
    status === "concluido"
  ) {
    return "/installation";
  }

  return "/field";
}

export function getOsModuleHref(osId: string, status: string): string {
  return `${getOsModuleBasePath(status)}/${osId}`;
}

/** Link do card no kanban — usa a coluna/fase, não o status (suporta colunas paralelas). */
export function getOsModuleHrefForKanbanPhase(
  osId: string,
  phaseId: string,
  status: string,
): string {
  const base =
    KANBAN_PHASE_MODULE_PATH[phaseId] ?? getOsModuleBasePath(status);
  return `${base}/${osId}`;
}
