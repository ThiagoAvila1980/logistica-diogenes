/** URL de busca no Google Maps (abre app nativo no mobile quando disponível). */
export function buildMapsSearchUrl(address: string): string | null {
  const query = address.trim();
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
