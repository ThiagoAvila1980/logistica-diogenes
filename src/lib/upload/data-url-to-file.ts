/**
 * Converte um data URL (ex.: export do DrawingBoard) em File para upload.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match?.[1] || !match[2]) {
    throw new Error("Data URL inválido (esperado data:<mime>;base64,...)");
  }

  const mime = match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime });
}
