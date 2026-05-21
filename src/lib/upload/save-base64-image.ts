import { randomUUID } from "crypto";
import { UPLOAD_MAX_FILE_BYTES } from "./config";
import { isDrawingDataUrl } from "./canvas-export";
import {
  assertWithinMaxBytes,
  convertDrawingToWebp,
} from "./image-to-webp";
import { putObject } from "./storage";

const DATA_URL_PATTERN =
  /^data:image\/(webp|png);base64,(.+)$/;

function drawingStorageKey(
  osId: string,
  subfolder: string,
  extension: string,
): string {
  const filename = `${randomUUID()}.${extension}`;
  return `measurements/${osId}/${subfolder}/${filename}`.replace(/\\/g, "/");
}

/** Converte data URL (WebP ou PNG) e persiste via storage (local / Supabase / R2). */
export async function saveBase64Drawing(
  dataUrl: string,
  osId: string,
  subfolder = "drawings",
): Promise<string> {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match?.[1] || !match[2]) {
    throw new Error(
      "Formato de imagem inválido (esperado WebP ou PNG em base64)",
    );
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > UPLOAD_MAX_FILE_BYTES) {
    throw new Error(
      `Desenho muito grande (máx. ${UPLOAD_MAX_FILE_BYTES / 1024 / 1024} MB)`,
    );
  }

  const output =
    mime === "webp"
      ? { buffer, contentType: "image/webp", extension: "webp" }
      : await convertDrawingToWebp(buffer);

  assertWithinMaxBytes(output.buffer, "Desenho");
  const key = drawingStorageKey(osId, subfolder, output.extension);
  return putObject(key, output.buffer, output.contentType);
}

/** @deprecated use saveBase64Drawing */
export const saveBase64Png = saveBase64Drawing;

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:image/");
}

/** Persiste drawingUrl de cada item (data URL → storage) */
export async function persistMeasurementDrawings(
  osId: string,
  items: Array<{ id: string; drawingUrl?: string | null }>,
): Promise<Array<{ id: string; drawingUrl: string | null }>> {
  const result: Array<{ id: string; drawingUrl: string | null }> = [];

  for (const item of items) {
    const url = item.drawingUrl ?? null;
    if (url && isDataUrl(url) && isDrawingDataUrl(url)) {
      const saved = await saveBase64Drawing(url, osId);
      result.push({ id: item.id, drawingUrl: saved });
    } else {
      result.push({ id: item.id, drawingUrl: url });
    }
  }

  return result;
}
