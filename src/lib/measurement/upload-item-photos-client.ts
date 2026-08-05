import { uploadPhotos } from "@/actions/upload-actions";
import { compressPhotoToJpegFile } from "@/lib/offline/photo-compress";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";

/**
 * Faz upload das fotos pendentes por vão.
 * Comprime no cliente e envia UMA foto por request — fotos de celular
 * somadas facilmente estouram o bodySizeLimit do Server Action e travam a UI.
 */
export async function uploadPendingItemPhotos(
  osId: string,
  items: MeasurementLineItem[],
  pendingByItemId: Record<string, File[]>,
): Promise<
  | { success: true; items: MeasurementLineItem[]; warnings?: string }
  | { success: false; message: string }
> {
  const warnings: string[] = [];
  const out: MeasurementLineItem[] = [];

  for (const item of items) {
    const pending = pendingByItemId[item.id] ?? [];
    let photos = filterDisplayableUploadUrls(item.photos ?? []);

    for (const file of pending) {
      const compressed = await compressPhotoToJpegFile(file);
      const fd = new FormData();
      fd.set("osId", osId);
      fd.set("scope", "measurements");
      fd.append("photos", compressed);

      const res = await uploadPhotos(fd);
      if (!res.success) {
        return { success: false, message: res.message };
      }

      photos = [...photos, ...res.urls];
      if (res.warnings?.length) {
        warnings.push(...res.warnings);
      }
    }

    out.push({
      ...item,
      photos: photos.length > 0 ? photos : undefined,
    });
  }

  return {
    success: true,
    items: out,
    warnings: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}
