/** URLs que podem ser exibidas ou persistidas (exclui blob temporário do browser). */
export function isDisplayableUploadUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return false;
  return true;
}

export function filterDisplayableUploadUrls(urls: string[]): string[] {
  return urls.filter(isDisplayableUploadUrl);
}
