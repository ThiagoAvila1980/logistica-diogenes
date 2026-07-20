/** Perfil físico da etiqueta térmica (POS-9220-L: 203 dpi). */
export type LabelProfile = {
  id: string;
  /** Largura do rótulo em mm (medir o papel real) */
  widthMm: number;
  /** Altura do rótulo em mm (medir o papel real) */
  heightMm: number;
  /**
   * Espaço (gap) entre etiquetas em mm.
   * 0 = papel contínuo; tipicamente 2–3 mm em rótulos com gap.
   */
  gapMm: number;
  /** Resolução da impressora (dots per inch) */
  dpi: 203;
  language: "tspl" | "zpl";
  /**
   * Direção TSPL: 0 = normal, 1 = 180° (ponta-cabeça).
   * Se a etiqueta sair invertida, troque este valor.
   */
  direction?: 0 | 1;
};

/**
 * 100 × 150 mm — tamanho padrão acordado.
 * Se cortar no meio, confira se o rótulo físico tem essa altura
 * e ajuste widthMm/heightMm/gapMm.
 * TSPL = linguagem nativa da POS-9220-L.
 */
export const DEFAULT_LABEL_PROFILE: LabelProfile = {
  id: "default-100x150",
  widthMm: 100,
  heightMm: 150,
  gapMm: 2,
  dpi: 203,
  language: "tspl",
  direction: 0,
};

/**
 * Em 203 dpi as impressoras de etiqueta usam a convenção 1 mm = 8 dots
 * (manual TSPL/ZPL da linha POS-9220).
 */
export function mmToDots(mm: number, dpi: number = 203): number {
  if (dpi === 203) return Math.round(mm * 8);
  return Math.round((mm * dpi) / 25.4);
}
