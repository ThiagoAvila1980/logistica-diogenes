import type { OrderListItem } from "@/lib/data/types";
import type { UserRole } from "@/lib/auth/permissions";
import { canViewAllOrders } from "@/lib/auth/permissions";
import {
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
  if (!canViewAllOrders(roles)) return false;
  return isInstallationPhaseStatus(order.status);
}

type OperatorListingOptions = {
  /** Quando definido (ex.: motorista), manda na decisão em vez do agregado global. */
  hasOperatorPendingWork?: boolean;
};

/** Espelha o kanban: transporte concluído some da coluna/módulo de transporte. */
export function isActiveTransportListing(
  order: OrderListItem,
  transportSteps: TransportSteps | null,
  options?: OperatorListingOptions,
): boolean {
  if (!isTransportPhaseStatus(order.status)) return true;
  if (options?.hasOperatorPendingWork !== undefined) {
    return options.hasOperatorPendingWork;
  }
  return transportSteps?.transporteConcluido !== true;
}
