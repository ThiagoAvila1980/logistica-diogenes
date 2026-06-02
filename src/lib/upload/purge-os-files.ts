import { rm } from "fs/promises";
import path from "path";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { deleteObject, isPersistedUploadUrl } from "./storage";
import { purgeCloudStoragePrefixes } from "./storage/purge-prefix";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function collectMeasurementFileUrls(input: {
  sourcePdfUrl?: string | null;
  photos?: string[] | null;
  items?: MeasurementLineItem[] | null;
}): string[] {
  const urls = new Set<string>();

  // PDF: só arquivo local (/uploads/...), nunca cloud storage
  if (input.sourcePdfUrl?.startsWith("/uploads/")) {
    urls.add(input.sourcePdfUrl);
  }

  for (const photo of input.photos ?? []) {
    if (isPersistedUploadUrl(photo)) urls.add(photo);
  }

  for (const item of input.items ?? []) {
    const drawing = item.drawingUrl;
    if (drawing && isPersistedUploadUrl(drawing)) urls.add(drawing);
    for (const photo of item.photos ?? []) {
      if (isPersistedUploadUrl(photo)) urls.add(photo);
    }
  }

  return [...urls];
}

export async function purgeFileUrls(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => deleteObject(url)));
}

/** Remove pastas locais da OS (inclui subpastas installation/before|after). */
export async function purgeLocalOsUploadDirs(osId: string): Promise<void> {
  const scopes = ["measurements", "installation", "advance"] as const;
  for (const scope of scopes) {
    const dir = path.join(UPLOAD_ROOT, scope, osId);
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      /* ignorar */
    }
  }
}

export async function purgeAllOsFiles(
  osId: string,
  urls: string[],
): Promise<void> {
  try {
    await purgeFileUrls(urls);
  } catch (error) {
    console.warn("[purgeAllOsFiles] purgeFileUrls", error);
  }

  await purgeLocalOsUploadDirs(osId);

  try {
    await purgeCloudStoragePrefixes(osId);
  } catch (error) {
    console.warn("[purgeAllOsFiles] purgeCloudStoragePrefixes", error);
  }
}
