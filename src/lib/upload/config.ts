export const UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
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
