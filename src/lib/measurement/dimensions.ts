import type { MeasurementLineItem } from "@/lib/workflow/schemas";

/** Larguras informadas (principal + extras), sem zeros. */
export function getLarguras(item: MeasurementLineItem): number[] {
  const values = [item.largura, ...(item.largurasExtras ?? [])].filter(
    (v) => v > 0,
  );
  return values;
}

/** Alturas informadas (principal + extras), sem zeros. */
export function getAlturas(item: MeasurementLineItem): number[] {
  const values = [item.altura, ...(item.alturasExtras ?? [])].filter(
    (v) => v > 0,
  );
  return values;
}

export function hasExtraDimensions(item: MeasurementLineItem): boolean {
  return (
    (item.largurasExtras?.length ?? 0) > 0 ||
    (item.alturasExtras?.length ?? 0) > 0
  );
}

export function hasAnyDimensionValue(item: MeasurementLineItem): boolean {
  return getLarguras(item).length > 0 || getAlturas(item).length > 0;
}

export function hasValidItemDimensions(item: MeasurementLineItem): boolean {
  return (
    item.qty > 0 && getLarguras(item).length > 0 && getAlturas(item).length > 0
  );
}

function formatDimensionList(values: number[]): string {
  if (values.length === 0) return "—";
  return values.map((v) => String(v)).join(" / ");
}

/** Resumo compacto: `2 × 1200 / 900 × 2100 / 1500 mm` */
/** Remove zeros e campos vazios antes de validar/salvar. */
export function sanitizeMeasurementItem(
  item: MeasurementLineItem,
): MeasurementLineItem {
  const largurasExtras = item.largurasExtras?.filter((v) => v > 0);
  const alturasExtras = item.alturasExtras?.filter((v) => v > 0);
  return {
    ...item,
    largurasExtras:
      largurasExtras && largurasExtras.length > 0 ? largurasExtras : undefined,
    alturasExtras:
      alturasExtras && alturasExtras.length > 0 ? alturasExtras : undefined,
    mostrarMedidasExtras:
      (largurasExtras?.length ?? 0) > 0 ||
      (alturasExtras?.length ?? 0) > 0 ||
      item.mostrarMedidasExtras,
  };
}

export function formatDimensionsSummary(item: MeasurementLineItem): string {
  const larguras = getLarguras(item);
  const alturas = getAlturas(item);
  if (larguras.length === 0 && alturas.length === 0) return "";

  const qtyPrefix = item.qty > 0 ? `${item.qty} × ` : "";
  const size =
    larguras.length > 0 || alturas.length > 0
      ? `${formatDimensionList(larguras)} × ${formatDimensionList(alturas)} mm`
      : "";
  return `${qtyPrefix}${size}`.trim();
}
