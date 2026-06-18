/**
 * Comprime imagem para máximo de 1920px no lado maior antes de salvar offline.
 * Reduz drasticamente o uso de storage no IndexedDB.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

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
    if (!ctx) return file;

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

export async function compressPhotos(files: File[]): Promise<Blob[]> {
  return Promise.all(files.map(compressPhoto));
}
