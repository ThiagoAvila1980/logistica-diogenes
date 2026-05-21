/** Qualidade WebP (0–1) para desenhos de medição */
export const DRAWING_WEBP_QUALITY = 0.82;

/** Exporta canvas como data URL WebP, com fallback PNG */
export function canvasToDrawingDataUrl(canvas: HTMLCanvasElement): string {
  try {
    const webp = canvas.toDataURL("image/webp", DRAWING_WEBP_QUALITY);
    if (webp.startsWith("data:image/webp")) return webp;
  } catch {
    /* navegador sem suporte a WebP no canvas */
  }
  return canvas.toDataURL("image/png");
}

export function isDrawingDataUrl(value: string): boolean {
  return (
    value.startsWith("data:image/webp") || value.startsWith("data:image/png")
  );
}
