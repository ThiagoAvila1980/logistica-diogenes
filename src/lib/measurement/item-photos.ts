import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";

/** Fotos de todos os itens + legado no nível da OS (sem duplicar URLs). */
export function aggregateMeasurementPhotos(
  items: MeasurementLineItem[],
  legacyPhotos: string[] = [],
): string[] {
  const fromItems = items.flatMap((item) => item.photos ?? []);
  const merged = new Set<string>([...fromItems, ...legacyPhotos]);
  return [...merged];
}

/** Move fotos antigas da OS para o primeiro item quando ainda não há fotos por item. */
export function mergeLegacyDraftPhotos(
  items: MeasurementLineItem[],
  legacyPhotos: string[],
): MeasurementLineItem[] {
  const displayable = filterDisplayableUploadUrls(legacyPhotos);
  if (displayable.length === 0 || items.length === 0) return items;
  if (items.some((item) => (item.photos?.length ?? 0) > 0)) return items;

  const [first, ...rest] = items;
  return [{ ...first, photos: displayable }, ...rest];
}

export function countItemPhotos(
  item: MeasurementLineItem,
  pendingCount = 0,
): number {
  return filterDisplayableUploadUrls(item.photos ?? []).length + pendingCount;
}
