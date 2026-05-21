import { UPLOAD_MAX_FILE_BYTES } from "./config";

export const PHOTO_WEBP_QUALITY = 82;
export const PHOTO_MAX_WIDTH = 1920;

export type ImageOutput = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

/** Converte foto para WebP; sem Sharp mantém formato original. */
export async function convertPhotoToWebp(
  buffer: Buffer,
  mime: string,
): Promise<ImageOutput> {
  const sharp = await import("sharp").catch(() => null);
  if (!sharp?.default) {
    return {
      buffer,
      contentType: mime || "image/jpeg",
      extension: extensionForMime(mime),
    };
  }

  try {
    const webpBuffer = await sharp
      .default(buffer)
      .rotate()
      .resize({
        width: PHOTO_MAX_WIDTH,
        height: PHOTO_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_WEBP_QUALITY })
      .toBuffer();

    if (webpBuffer.length <= UPLOAD_MAX_FILE_BYTES) {
      return {
        buffer: webpBuffer,
        contentType: "image/webp",
        extension: "webp",
      };
    }

    const smaller = await sharp
      .default(buffer)
      .rotate()
      .resize({
        width: PHOTO_MAX_WIDTH,
        height: PHOTO_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 70 })
      .toBuffer();

    if (smaller.length <= UPLOAD_MAX_FILE_BYTES) {
      return {
        buffer: smaller,
        contentType: "image/webp",
        extension: "webp",
      };
    }
  } catch (err) {
    console.warn("[convertPhotoToWebp] falha na conversão, usando original:", err);
  }

  return {
    buffer,
    contentType: mime || "image/jpeg",
    extension: extensionForMime(mime),
  };
}

/** Converte buffer (PNG/WebP) para WebP; fallback PNG sem Sharp. */
export async function convertDrawingToWebp(buffer: Buffer): Promise<ImageOutput> {
  const sharp = await import("sharp").catch(() => null);
  if (!sharp?.default) {
    return { buffer, contentType: "image/png", extension: "png" };
  }

  const webpBuffer = await sharp
    .default(buffer)
    .webp({ quality: PHOTO_WEBP_QUALITY })
    .toBuffer();

  return {
    buffer: webpBuffer,
    contentType: "image/webp",
    extension: "webp",
  };
}

export function assertWithinMaxBytes(buffer: Buffer, label: string): void {
  if (buffer.length > UPLOAD_MAX_FILE_BYTES) {
    throw new Error(
      `${label} muito grande (máx. ${UPLOAD_MAX_FILE_BYTES / 1024 / 1024} MB)`,
    );
  }
}
