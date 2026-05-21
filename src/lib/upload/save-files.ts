import { randomUUID } from "crypto";
import {
  UPLOAD_ALLOWED_MIME,
  UPLOAD_MAX_FILE_BYTES,
  UPLOAD_MAX_FILES,
  type UploadScope,
} from "./config";
import {
  assertWithinMaxBytes,
  convertPhotoToWebp,
} from "./image-to-webp";
import {
  buildStorageKey,
  isPersistedUploadUrl,
  putObject,
} from "./storage";

export function validateImageFile(file: File): string | null {
  if (!file.size) return "Arquivo vazio";
  if (file.size > UPLOAD_MAX_FILE_BYTES) {
    return `Arquivo muito grande (máx. ${UPLOAD_MAX_FILE_BYTES / 1024 / 1024} MB)`;
  }
  if (!UPLOAD_ALLOWED_MIME.has(file.type)) {
    return `Tipo não permitido: ${file.type || "desconhecido"}`;
  }
  return null;
}

export async function saveUploadedFiles(
  files: File[],
  scope: UploadScope,
  osId: string,
): Promise<{ urls: string[]; errors: string[] }> {
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (validFiles.length > UPLOAD_MAX_FILES) {
    return {
      urls: [],
      errors: [`Máximo de ${UPLOAD_MAX_FILES} fotos por envio`],
    };
  }

  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of validFiles) {
    const err = validateImageFile(file);
    if (err) {
      errors.push(`${file.name}: ${err}`);
      continue;
    }

    try {
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const converted = await convertPhotoToWebp(rawBuffer, file.type);
      assertWithinMaxBytes(converted.buffer, file.name);

      const key = buildStorageKey(scope, osId, converted.extension);
      const url = await putObject(key, converted.buffer, converted.contentType);
      urls.push(url);
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : "Falha ao salvar foto";
      errors.push(`${file.name}: ${message}`);
    }
  }

  return { urls, errors };
}

export function parseExistingUrls(
  formData: FormData,
  field = "existingPhotos",
): string[] {
  const raw = formData.getAll(field);
  const urls: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && isPersistedUploadUrl(item)) {
      urls.push(item);
    }
  }
  return urls;
}

export function parsePhotoFiles(formData: FormData, field = "photos"): File[] {
  return formData
    .getAll(field)
    .filter((f): f is File => f instanceof File && f.size > 0);
}
