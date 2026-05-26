/**
 * Base path do módulo operacional para uma OS, conforme etapa atual.
 */
export function getOsModuleBasePath(status: string): string {
  if (status.startsWith("medicao")) return "/field";
  if (
    status.includes("orcamento") ||
    status === "aprovado_cliente"
  ) {
    return "/quote";
  }
  if (
    status === "cortes" ||
    status === "embalagem" ||
    status === "acessorios_plano" ||
    status.includes("corte")
  ) {
    return "/production";
  }
  if (
    status.startsWith("transporte_") ||
    status.includes("transporte")
  ) {
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
