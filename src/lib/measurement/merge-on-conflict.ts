import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";

/**
 * Mescla os itens enviados pelo cliente com os itens já persistidos no
 * servidor quando outro dispositivo salvou depois que este capturou seu
 * snapshot local (conflito offline). Itens editados nos dois lados: o
 * cliente vence (last-write-wins), mas itens que só existem no servidor
 * (criados por outro dispositivo) são preservados em vez de descartados.
 */
export function mergeMeasurementItemsOnConflict(
  clientItems: MeasurementLineItem[],
  serverItems: MeasurementLineItem[],
): MeasurementLineItem[] {
  const clientIds = new Set(clientItems.map((item) => item.id));
  const serverOnlyItems = serverItems.filter((item) => !clientIds.has(item.id));
  return sortMeasurementItemsOldestFirst([...clientItems, ...serverOnlyItems]);
}
