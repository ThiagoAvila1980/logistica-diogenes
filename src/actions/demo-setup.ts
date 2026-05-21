"use server";

import { revalidatePath } from "next/cache";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";

export async function setupDemoPrerequisites(
  osId: string,
  type: "measurement" | "cutting" | "installation",
) {
  if (!useMockData()) return;

  if (type === "measurement") {
    mockRepository.addFinalMeasurement(osId);
  }
  if (type === "cutting") {
    mockRepository.addFinalMeasurement(osId);
    mockRepository.ensureCuttingComplete(osId);
  }
  if (type === "installation") {
    mockRepository.ensureInstallationComplete(osId);
  }

  revalidatePath(`/dashboard/${osId}`);
}
