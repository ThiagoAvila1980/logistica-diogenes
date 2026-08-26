import type {
  CuttingChecklistStep,
  MeasurementLineItem,
} from "@/lib/workflow/schemas";

const EMPTY_PROGRESS = {
  corte: false,
  embalagem: false,
  acessorios: false,
  vidros: false,
} as const;

export function applyCuttingStepPhoto(
  item: MeasurementLineItem,
  step: CuttingChecklistStep,
  photoUrl: string,
): MeasurementLineItem {
  const prev = item.cuttingProgress ?? EMPTY_PROGRESS;
  return {
    ...item,
    cuttingProgress: { ...prev, [step]: true },
    cuttingStepPhotos: { ...item.cuttingStepPhotos, [step]: photoUrl },
  };
}

export function collectCuttingStepPhotoUrls(
  item: MeasurementLineItem,
): string[] {
  const photos = item.cuttingStepPhotos;
  if (!photos) return [];
  return Object.values(photos).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );
}
