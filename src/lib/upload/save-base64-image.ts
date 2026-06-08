import { randomUUID } from "crypto";
import { UPLOAD_MAX_FILE_BYTES } from "./config";
import { isDrawingDataUrl } from "./canvas-export";
import {
  assertWithinMaxBytes,
  convertDrawingToWebp,
} from "./image-to-webp";
import { normalizePersistedUploadUrl } from "./resolve-display-url";
import { putObject } from "./storage";
import type { DrawingItem } from "@/lib/workflow/schemas";

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

type PersistedItemDrawings = {
  id: string;
  drawingUrl: string | null;
  drawings: DrawingItem[] | undefined;
};

async function persistSingleDrawingUrl(
  url: string | null | undefined,
  osId: string,
): Promise<string | null> {
  const v = url ?? null;
  if (v && isDataUrl(v) && isDrawingDataUrl(v)) {
    return saveBase64Drawing(v, osId);
  }
  return v ? normalizePersistedUploadUrl(v) : v;
}

/** Persiste drawings[] e drawingUrl de cada item (data URL → storage) */
export async function persistMeasurementDrawings(
  osId: string,
  items: Array<{
    id: string;
    drawingUrl?: string | null;
    drawings?: DrawingItem[];
  }>,
): Promise<PersistedItemDrawings[]> {
  const result: PersistedItemDrawings[] = [];

  for (const item of items) {
    if (item.drawings && item.drawings.length > 0) {
      // Novo modelo: persiste cada desenho do array
      const persistedDrawings: DrawingItem[] = [];
      for (const drawing of item.drawings) {
        const savedUrl = await persistSingleDrawingUrl(drawing.url, osId);
        persistedDrawings.push({ ...drawing, url: savedUrl ?? drawing.url });
      }
      result.push({
        id: item.id,
        drawingUrl: persistedDrawings[0]?.url ?? null,
        drawings: persistedDrawings,
      });
    } else {
      // Modelo legado: apenas drawingUrl
      const savedUrl = await persistSingleDrawingUrl(item.drawingUrl, osId);
      result.push({
        id: item.id,
        drawingUrl: savedUrl,
        drawings: undefined,
      });
    }
  }

  return result;
}
