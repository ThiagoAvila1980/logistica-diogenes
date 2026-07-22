import type { OrderListItem } from "@/lib/data/types";
import type { UserRole } from "@/lib/auth/permissions";
import { canViewAllOrders, hasRole } from "@/lib/auth/permissions";
import {
  isTransportPhaseStatus,
} from "@/lib/transport-gates";
import type { InstallationOrderProgress } from "@/lib/data/installation-steps-batch";

/** Candidatos à listagem do módulo de instalação (antes de checar progresso). */
export function isInstallationIndexCandidate(
  order: OrderListItem,
  roles: readonly UserRole[],
): boolean {
  if (order.status === "concluido") return false;
  if (order.status.startsWith("instalacao")) return true;
  if (isTransportPhaseStatus(order.status)) {
    // Admin/gerente: pool para designar. Instalador: só chega aqui se já
    // tiver vão designado (canAccessOrder + hasPendingInstallationWorkForInstaller).
    return canViewAllOrders(roles) || hasRole(roles, "instalador");
  }
  return false;
}

type OperatorListingOptions = {
  /** Quando definido (ex.: instalador), manda na decisão em vez do agregado global. */
  hasOperatorPendingWork?: boolean;
};

/** OS some de /installation quando todos os vãos foram confirmados como concluídos. */
export function isActiveInstallationListing(
  order: OrderListItem,
  progress: InstallationOrderProgress | null,
  options?: OperatorListingOptions,
): boolean {
  if (order.status === "concluido") return false;
  if (options?.hasOperatorPendingWork !== undefined) {
    return options.hasOperatorPendingWork;
  }
  if (!progress) return true;
  return !progress.todosVaosConcluidos;
}
