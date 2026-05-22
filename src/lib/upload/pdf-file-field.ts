export function parsePdfFileField(formData: FormData, field = "pdf"): File | null {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) return file;
  return null;
}
