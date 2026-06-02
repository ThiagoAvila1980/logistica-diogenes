import { uploadPhotos } from "@/actions/upload-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";

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

    if (pending.length > 0) {
      const fd = new FormData();
      fd.set("osId", osId);
      fd.set("scope", "measurements");
      pending.forEach((file) => fd.append("photos", file));

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
