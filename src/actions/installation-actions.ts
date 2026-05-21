"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { getServiceOrderById } from "@/lib/data/orders";
import { getSession } from "@/lib/auth/session";
import {
  parseExistingUrls,
  parsePhotoFiles,
  saveUploadedFiles,
} from "@/lib/upload/save-files";

const saveInstallationSchema = z.object({
  osId: z.string().uuid(),
  notes: z.string().max(4000).optional(),
});

export type SaveInstallationDraftResult =
  | { success: true; message: string }
  | { success: false; message: string };

async function resolveInstallationPhotos(
  osId: string,
  formData: FormData,
): Promise<{
  before: string[];
  after: string[];
  error?: string;
}> {
  const beforeExisting = parseExistingUrls(formData, "existingBefore");
  const afterExisting = parseExistingUrls(formData, "existingAfter");
  const beforeFiles = parsePhotoFiles(formData, "photosBefore");
  const afterFiles = parsePhotoFiles(formData, "photosAfter");

  const [beforeUpload, afterUpload] = await Promise.all([
    beforeFiles.length > 0
      ? saveUploadedFiles(beforeFiles, "installation", `${osId}/before`)
      : Promise.resolve({ urls: [] as string[], errors: [] as string[] }),
    afterFiles.length > 0
      ? saveUploadedFiles(afterFiles, "installation", `${osId}/after`)
      : Promise.resolve({ urls: [] as string[], errors: [] as string[] }),
  ]);

  const errors = [...beforeUpload.errors, ...afterUpload.errors];
  return {
    before: [...beforeExisting, ...beforeUpload.urls],
    after: [...afterExisting, ...afterUpload.urls],
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

export async function saveInstallationDraft(
  formData: FormData,
): Promise<SaveInstallationDraftResult> {
  const raw = {
    osId: formData.get("osId"),
    notes: formData.get("notes") || undefined,
  };

  const parsed = saveInstallationSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const { osId, notes } = parsed.data;
  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "OS não encontrada." };
  }

  if (
    !order.status.startsWith("instalacao") &&
    order.status !== "concluido"
  ) {
    return {
      success: false,
      message: "Esta OS não está em etapa de instalação.",
    };
  }

  const { before, after, error: photoError } =
    await resolveInstallationPhotos(osId, formData);

  if (useMockData()) {
    const result = mockRepository.saveInstallationDraft(osId, {
      notes: notes ?? null,
      photos: { before, after },
    });
    if (!result.success) return result;
    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath(`/dashboard/${osId}`);
    const warn = photoError ? ` Aviso: ${photoError}` : "";
    return {
      success: true,
      message: `Registro salvo (modo demo).${warn}`,
    };
  }

  try {
    const session = await getSession();
    const { upsertInstallationDraftDb } = await import(
      "@/lib/data/installation-db"
    );
    await upsertInstallationDraftDb(osId, {
      notes: notes ?? null,
      photos: { before, after },
      installerId: session?.userId,
    });
    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath(`/dashboard/${osId}`);
    const warn = photoError ? ` Aviso: ${photoError}` : "";
    return {
      success: true,
      message: `Registro de instalação salvo.${warn}`,
    };
  } catch {
    return { success: false, message: "Erro ao salvar instalação." };
  }
}
