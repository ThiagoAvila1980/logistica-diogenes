import { isPersistedUploadUrl } from "./storage/url-utils";

/** URL pronta para `<img src>` sem server action (local, R2 ou Supabase público). */
export function toBrowserDisplayUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  return trimmed;
}

/** Indica se o cliente deve chamar `resolveUploadDisplayUrl` (chave crua ou URL não persistida). */
export function shouldResolveUploadUrlClientSide(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("mock://")) return false;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/uploads/") ||
    trimmed.startsWith("uploads/")
  ) {
    return false;
  }
  // Signed URLs já estão prontas para uso direto — não precisam de nova resolução
  if (trimmed.includes("/storage/v1/object/sign/")) return false;
  if (isPersistedUploadUrl(trimmed)) return false;
  if (trimmed.startsWith("catalog/") || trimmed.startsWith("measurements/")) {
    return true;
  }
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}
