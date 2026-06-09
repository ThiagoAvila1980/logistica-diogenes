import type { MeasurementLineItem } from "@/lib/workflow/schemas";

/** Chave numérica para ordenar itens do mais antigo ao mais novo. */
function getMeasurementItemSortKey(id: string): number {
  const timestampMatch = id.match(/-item-(\d{10,})$/);
  if (timestampMatch) return Number(timestampMatch[1]);

  const indexMatch = id.match(/-item-(\d+)$/);
  if (indexMatch) return Number(indexMatch[1]);

  return Number.MAX_SAFE_INTEGER;
}

/** Ordena medições do mais antigo para o mais recente. */
export function sortMeasurementItemsOldestFirst(
  items: MeasurementLineItem[],
): MeasurementLineItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const keyDiff =
        getMeasurementItemSortKey(a.item.id) -
        getMeasurementItemSortKey(b.item.id);
      return keyDiff !== 0 ? keyDiff : a.index - b.index;
    })
    .map(({ item }) => item);
}
