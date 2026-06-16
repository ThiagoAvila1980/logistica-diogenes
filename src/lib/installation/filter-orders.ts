import type { OrderListItem } from "@/lib/data/types";
import type { UserRole } from "@/lib/auth/permissions";
import { canViewAllOrders, hasRole } from "@/lib/auth/permissions";
import {
  isTransportPhaseStatus,
  type InstallationSteps,
} from "@/lib/transport-gates";

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

/** Instalação concluída vai para /concluded e some de /installation. */
export function isActiveInstallationListing(
  order: OrderListItem,
  installationSteps: InstallationSteps | null,
): boolean {
  if (order.status === "concluido") return false;
  if (!installationSteps) return true;

  const installationComplete =
    installationSteps.instalacaoEstruturalFeita &&
    installationSteps.instalacaoVidrosFeita &&
    installationSteps.instalacaoAcabamentoFeito;

  return !installationComplete;
}
