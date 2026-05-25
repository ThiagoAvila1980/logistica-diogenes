import type { OsStatus } from "@/db/schema";

export type StageAlertType =
  | "measurement"
  | "cutting"
  | "transport"
  | "installation";

export const STAGE_ALERT_TYPES = [
  "measurement",
  "cutting",
  "transport",
  "installation",
] as const;

export function getStageAlertTypeFromEtapa(
  etapa: OsStatus,
): StageAlertType | null {
  if (etapa.startsWith("medicao")) return "measurement";
  if (etapa === "cortes" || etapa === "embalagem" || etapa === "acessorios_plano") {
    return "cutting";
  }
  if (etapa.startsWith("transporte_")) return "transport";
  if (
    etapa.startsWith("instalacao") ||
    etapa === "revisao"
  ) {
    return "installation";
  }
  return null;
}

export function getStageAlertMeta(stage: StageAlertType): {
  type: string;
  titlePrefix: string;
  href: (measurementId: string) => string;
  defaultSender: string;
} {
  switch (stage) {
    case "measurement":
      return {
        type: "measurement_alert",
        titlePrefix: "Problema na medição",
        href: (id) => `/field/${id}`,
        defaultSender: "Medidor",
      };
    case "cutting":
      return {
        type: "cutting_alert",
        titlePrefix: "Problema no corte",
        href: (id) => `/production/${id}`,
        defaultSender: "Cortador",
      };
    case "transport":
      return {
        type: "transport_alert",
        titlePrefix: "Problema no transporte",
        href: (id) => `/logistics/${id}`,
        defaultSender: "Motorista",
      };
    case "installation":
      return {
        type: "installation_alert",
        titlePrefix: "Problema na instalação",
        href: (id) => `/installation/${id}`,
        defaultSender: "Instalador",
      };
  }
}

export const STAGE_ALERT_ALLOWED_ROLES: Record<
  StageAlertType,
  readonly string[]
> = {
  measurement: ["admin", "gerente", "medidor"],
  cutting: ["admin", "gerente", "cortador"],
  transport: ["admin", "gerente", "motorista"],
  installation: ["admin", "gerente", "instalador"],
};
