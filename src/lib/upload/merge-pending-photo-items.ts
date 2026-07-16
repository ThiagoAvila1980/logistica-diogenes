export type PendingPhotoItemLike = {
  id: string;
  url: string;
  file?: File;
  preview?: string;
};

export function fileIdentityKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Injeta arquivos pendentes (ex.: reidratação offline) sem duplicar
 * arquivos que já estão na lista local do PhotoUpload.
 */
export function mergePendingPhotoItems<T extends PendingPhotoItemLike>(
  current: T[],
  incomingFiles: File[],
  createItem: (file: File) => T,
  maxFiles: number,
): T[] {
  if (incomingFiles.length === 0) return current;

  const existingKeys = new Set(
    current.filter((item) => item.file).map((item) => fileIdentityKey(item.file!)),
  );

  const toAdd = incomingFiles.filter(
    (file) => !existingKeys.has(fileIdentityKey(file)),
  );
  if (toAdd.length === 0) return current;

  return [...current, ...toAdd.map(createItem)].slice(0, maxFiles);
}
