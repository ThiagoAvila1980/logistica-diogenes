import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";

export type InstallationDraft = {
  notes?: string;
  photosBefore?: string[];
  photosAfter?: string[];
  structuralInstalled?: boolean;
  glassInstalled?: boolean;
  finalCompleted?: boolean;
};

export async function getInstallationDraft(
  osId: string,
): Promise<InstallationDraft | undefined> {
  if (useMockData()) {
    return mockRepository.getInstallationDraft(osId);
  }
  const { getInstallationDraftDb } = await import("./installation-db");
  return getInstallationDraftDb(osId);
}
