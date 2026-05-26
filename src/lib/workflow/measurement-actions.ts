import type { OsStatus } from "@/db/schema";

/** Tipo persistido em `measurements.type`. */
export type MeasurementDbType = "orcamento" | "final";

export const ORCAMENTO_MEASUREMENT_TYPE: MeasurementDbType = "orcamento";
export const FINAL_MEASUREMENT_TYPE: MeasurementDbType = "final";

export type MeasurementOrderContext = {
  etapa: OsStatus;
};

export function osStatusFromMeasurementType(
  type: MeasurementDbType,
): OsStatus {
  return type === "orcamento" ? "medicao_orcamento" : "medicao_final";
}

export function measurementTypeFromOsStatus(
  status: OsStatus,
): MeasurementDbType | null {
  if (status === "medicao_orcamento") return ORCAMENTO_MEASUREMENT_TYPE;
  if (status === "medicao_final") return FINAL_MEASUREMENT_TYPE;
  return null;
}

/** Mantém `measurements.type` alinhado quando `etapa` muda na fase de medição. */
export function measurementTypePatchForEtapa(
  etapa: OsStatus,
): Partial<{ type: MeasurementDbType }> {
  const type = measurementTypeFromOsStatus(etapa);
  return type ? { type } : {};
}

export function isMedicaoPhaseStatus(status: OsStatus): boolean {
  return status === "medicao_orcamento" || status === "medicao_final";
}

export function getAllowedMeasurementActions(
  order: MeasurementOrderContext,
): MeasurementDbType[] {
  if (isMedicaoPhaseStatus(order.etapa)) {
    return [ORCAMENTO_MEASUREMENT_TYPE, FINAL_MEASUREMENT_TYPE];
  }
  return [];
}

export function isMeasurementActionAllowed(
  order: MeasurementOrderContext,
  type: MeasurementDbType,
): boolean {
  return getAllowedMeasurementActions(order).includes(type);
}

export function getDraftMeasurementType(
  order: MeasurementOrderContext,
): MeasurementDbType | null {
  return measurementTypeFromOsStatus(order.etapa);
}

export function getMeasurementActionLabel(type: MeasurementDbType): string {
  return type === "orcamento"
    ? "Medição de Orçamento"
    : "Medição Final";
}

export function getMeasurementBadgeLabel(
  type: MeasurementDbType,
): string {
  return getMeasurementActionLabel(type);
}

export function getMeasurementDimensionsHint(
  type: MeasurementDbType,
): string {
  return type === "orcamento"
    ? "Registre medidas preliminares para elaboração do orçamento."
    : "Registre ambiente, quantidade, largura e altura de cada peça para produção e instalação.";
}

export function getMeasurementConfirmCopy(type: MeasurementDbType): {
  title: string;
  description: string;
  confirm: string;
} {
  const label = getMeasurementActionLabel(type);
  return {
    title: `Confirmar ${label.toLowerCase()}`,
    description:
      type === "orcamento"
        ? "As medidas serão usadas na elaboração do orçamento."
        : "As medidas exatas serão usadas para produção e instalação.",
    confirm: `Registrar ${label.toLowerCase()}`,
  };
}

export function getMeasurementActionErrorMessage(
  type: MeasurementDbType,
): string {
  return `${getMeasurementActionLabel(type)} só é permitida enquanto a medição está em etapa de medição.`;
}
