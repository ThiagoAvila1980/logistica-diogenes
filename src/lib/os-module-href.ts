/**
 * Base path do módulo operacional para uma OS, conforme etapa atual.
 */
export function getOsModuleBasePath(
  status: string,
  revisionFromStatus?: string | null,
): string {
  const effectiveStatus =
    status === "revisao" && revisionFromStatus ? revisionFromStatus : status;

  if (effectiveStatus.startsWith("medicao")) return "/field";
  if (
    effectiveStatus.includes("orcamento") ||
    effectiveStatus === "aprovado_cliente"
  ) {
    return "/quote";
  }
  if (
    effectiveStatus === "cortes" ||
    effectiveStatus === "embalagem" ||
    effectiveStatus === "acessorios_plano" ||
    effectiveStatus.includes("corte")
  ) {
    return "/production";
  }
  if (
    effectiveStatus.startsWith("transporte_") ||
    effectiveStatus.includes("transporte")
  ) {
    return "/logistics";
  }
  if (
    effectiveStatus.startsWith("instalacao") ||
    effectiveStatus === "concluido"
  ) {
    return "/installation";
  }

  return "/field";
}

export function getOsModuleHref(
  osId: string,
  status: string,
  revisionFromStatus?: string | null,
): string {
  return `${getOsModuleBasePath(status, revisionFromStatus)}/${osId}`;
}
