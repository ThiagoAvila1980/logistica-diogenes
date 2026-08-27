import type {
  InstallationChecklistStep,
  MeasurementLineItem,
} from "@/lib/workflow/schemas";

const EMPTY_PROGRESS = {
  estrutural: false,
  vidros: false,
  acabamento: false,
} as const;

export function applyInstallationStepPhotos(
  item: MeasurementLineItem,
  step: InstallationChecklistStep,
  photoUrls: string[],
): MeasurementLineItem {
  const urls = photoUrls.filter((url) => url.trim().length > 0);
  if (urls.length === 0) {
    throw new Error("Envie ao menos uma foto para concluir a etapa.");
  }

  const prev = item.installationProgress ?? EMPTY_PROGRESS;
  return {
    ...item,
    installationProgress: { ...prev, [step]: true },
    installationStepPhotos: {
      ...item.installationStepPhotos,
      [step]: urls,
    },
  };
}

export function collectInstallationStepPhotoUrls(
  item: MeasurementLineItem,
): string[] {
  const photos = item.installationStepPhotos;
  if (!photos) return [];
  return Object.values(photos)
    .flat()
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}
