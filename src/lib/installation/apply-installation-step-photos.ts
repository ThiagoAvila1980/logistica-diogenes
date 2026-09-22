import type {
  InstallationChecklistStep,
  ItemInstallationProgress,
  MeasurementLineItem,
} from "@/lib/workflow/schemas";

const EMPTY_PROGRESS: ItemInstallationProgress = {
  estrutural: false,
  vidros: false,
  acabamento: false,
};

export function applyInstallationStepPhotos(
  item: MeasurementLineItem,
  step: InstallationChecklistStep,
  photoUrls: string[],
  now: Date = new Date(),
): MeasurementLineItem {
  const urls = photoUrls.filter((url) => url.trim().length > 0);
  if (urls.length === 0) {
    throw new Error("Envie ao menos uma foto para concluir a etapa.");
  }

  const prev = item.installationProgress ?? EMPTY_PROGRESS;
  return {
    ...item,
    installationProgress: {
      ...prev,
      [step]: true,
      // Data de finalização do vão: carimba na 1ª fase concluída e nunca muda.
      completedAt: prev.completedAt ?? now.toISOString(),
    },
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
