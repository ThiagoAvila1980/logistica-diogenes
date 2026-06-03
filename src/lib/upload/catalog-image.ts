import { randomUUID } from "crypto";
import { UPLOAD_MAX_FILE_BYTES } from "./config";
import {
  assertWithinMaxBytes,
  convertPhotoToWebp,
} from "./image-to-webp";
import { deleteObject, putObject } from "./storage";
import { validateImageFile } from "./save-files";

/** Pasta exclusiva no bucket para imagens de tipos de envidraçamento. */
export const TIPO_ENVIDRACAMENTO_STORAGE_PREFIX =
  "catalog/tipo-envidracamento";

function buildTipoEnvidracamentoImageKey(extension: string): string {
  const filename = `${randomUUID()}.${extension}`;
  return `${TIPO_ENVIDRACAMENTO_STORAGE_PREFIX}/${filename}`.replace(
    /\\/g,
    "/",
  );
}

export async function saveTipoEnvidracamentoImage(
  file: File,
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const converted = await convertPhotoToWebp(rawBuffer, file.type);
  assertWithinMaxBytes(converted.buffer, file.name);

  const key = buildTipoEnvidracamentoImageKey(converted.extension);
  return putObject(key, converted.buffer, converted.contentType);
}

export async function deleteTipoEnvidracamentoImage(
  url: string | null | undefined,
): Promise<void> {
  if (!url?.trim()) return;
  await deleteObject(url.trim());
}

export function parseCatalogImageFile(
  formData: FormData,
  field = "imagem",
): File | null {
  const value = formData.get(field);
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return null;
}

export function parseExistingCatalogImageUrl(
  formData: FormData,
  field = "existingImagemUrl",
): string | null {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}
