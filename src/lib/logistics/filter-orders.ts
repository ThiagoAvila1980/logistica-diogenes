import type { OrderListItem } from "@/lib/data/types";
import type { UserRole } from "@/lib/auth/permissions";
import { canViewAllOrders } from "@/lib/auth/permissions";
import {
  isCuttingPhaseStatus,
  isInstallationPhaseStatus,
  isTransportPhaseStatus,
  type TransportSteps,
} from "@/lib/transport-gates";

/** Candidatos à listagem do módulo de transporte (antes de checar progresso). */
export function isLogisticsIndexCandidate(
  order: OrderListItem,
  roles: readonly UserRole[],
): boolean {
  if (isTransportPhaseStatus(order.status)) return true;
  if (isCuttingPhaseStatus(order.status)) return canViewAllOrders(roles);
  if (order.status === "concluido") {
    return canViewAllOrders(roles) || roles.includes("motorista");
  }
  if (!canViewAllOrders(roles)) return false;
  return isInstallationPhaseStatus(order.status);
}

type OperatorListingOptions = {
  /** Quando definido (ex.: motorista), manda na decisão em vez do agregado global. */
  hasOperatorPendingWork?: boolean;
  /**
   * Trabalho real de transporte ainda aberto (vão cortado sem entrega,
   * ou corte pronto e não enviado à instalação). Usado quando a etapa
   * da OS já é concluído.
   */
  hasPendingTransportWork?: boolean;
};

/**
 * OS sai da tela de transporte quando todos os vãos concluíram as entregas,
 * mesmo que o status já tenha avançado para instalação. OS concluída permanece
 * só enquanto `hasPendingTransportWork` indicar vão ainda parado no transporte.
 */
export function isActiveTransportListing(
  order: OrderListItem,
  transportSteps: TransportSteps | null,
  options?: OperatorListingOptions,
): boolean {
  if (options?.hasOperatorPendingWork !== undefined) {
    return options.hasOperatorPendingWork;
  }
  if (options?.hasPendingTransportWork !== undefined) {
    return options.hasPendingTransportWork;
  }
  if (order.status === "concluido") return false;
  return transportSteps?.transporteConcluido !== true;
}
