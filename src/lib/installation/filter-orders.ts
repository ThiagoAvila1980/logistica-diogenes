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
    return canViewAllOrders(roles) || hasRole(roles, "instalador");
  }
  return false;
}

/** OS some de /installation quando todos os vãos foram confirmados como concluídos. */
export function isActiveInstallationListing(
  order: OrderListItem,
  progress: InstallationOrderProgress | null,
): boolean {
  if (order.status === "concluido") return false;
  if (!progress) return true;
  return !progress.todosVaosConcluidos;
}
