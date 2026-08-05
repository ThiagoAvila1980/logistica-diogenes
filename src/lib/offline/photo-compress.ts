/**
 * Comprime imagem para máximo de 1920px no lado maior.
 * Usado no save offline (IndexedDB) e no upload online (Server Action).
 * Reduz payload, memória e risco de estourar o bodySizeLimit.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof setTimeout === "function") {
      setTimeout(resolve, 0);
      return;
    }
    resolve();
  });
}

export async function compressPhoto(file: File): Promise<Blob> {
  if (!("createImageBitmap" in globalThis)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetWidth = width;
    let targetHeight = height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.round((height / width) * MAX_DIMENSION);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.round((width / height) * MAX_DIMENSION);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  } catch {
    return file;
  }
}

/** Já otimizado no aparelho — evita segunda compressão no save. */
const SKIP_RECOMPRESS_BYTES = 900_000;

/** Comprime e devolve File JPEG pronto para FormData / preview. */
export async function compressPhotoToJpegFile(file: File): Promise<File> {
  if (file.type === "image/jpeg" && file.size <= SKIP_RECOMPRESS_BYTES) {
    return file;
  }

  const blob = await compressPhoto(file);
  if (blob instanceof File && blob.type === "image/jpeg") {
    return blob;
  }
  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${baseName}.jpg`, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

/** Comprime em sequência para não saturar CPU/memória no celular. */
export async function compressPhotos(files: File[]): Promise<Blob[]> {
  const out: Blob[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    out.push(await compressPhoto(file));
    if (i < files.length - 1) {
      await yieldToMain();
    }
  }
  return out;
}

export async function compressPhotosToJpegFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    out.push(await compressPhotoToJpegFile(file));
    if (i < files.length - 1) {
      await yieldToMain();
    }
  }
  return out;
}
