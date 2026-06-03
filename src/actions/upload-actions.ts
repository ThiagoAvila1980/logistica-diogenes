"use server";

import { z } from "zod";
import {
  saveUploadedFiles,
  parsePhotoFiles,
} from "@/lib/upload/save-files";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import type { UploadScope } from "@/lib/upload/config";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";

const uploadSchema = z.object({
  osId: z.string().uuid(),
  scope: z.enum(["measurements", "installation", "advance"]),
});

export type UploadPhotosResult =
  | { success: true; urls: string[]; warnings?: string[] }
  | { success: false; message: string };

export async function uploadPhotos(
  formData: FormData,
): Promise<UploadPhotosResult> {
  try {
    await requireRole(["admin", "gerente", "medidor", "instalador"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão para enviar fotos." };
  }

  const parsed = uploadSchema.safeParse({
    osId: formData.get("osId"),
    scope: formData.get("scope"),
  });

  if (!parsed.success) {
    return { success: false, message: "Dados de upload inválidos" };
  }

  const files = parsePhotoFiles(formData);
  if (files.length === 0) {
    return { success: false, message: "Nenhuma foto selecionada" };
  }

  const { urls, errors } = await saveUploadedFiles(
    files,
    parsed.data.scope as UploadScope,
    parsed.data.osId,
  );

  if (urls.length === 0) {
    return {
      success: false,
      message: errors.join("; ") || "Falha ao salvar fotos",
    };
  }

  return {
    success: true,
    urls,
    warnings: errors.length > 0 ? errors : undefined,
  };
}

export async function resolveUploadDisplayUrlAction(
  url: string,
): Promise<string> {
  if (!url.trim()) return url;
  return resolveUploadDisplayUrl(url);
}
