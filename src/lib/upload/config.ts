export const UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB após conversão
/** Limite do arquivo bruto recebido (antes do Sharp); celular costuma mandar 8–12 MB. */
export const UPLOAD_MAX_RAW_FILE_BYTES = 20 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 12;

export const UPLOAD_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type UploadScope =
  | "measurements"
  | "installation"
  | "advance";
