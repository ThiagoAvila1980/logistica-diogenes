/** Ponto em coordenadas do documento (independente de resolução de tela) */
export type Point = { x: number; y: number };

export type Tool = "pen" | "eraser";

/** Um traço contíguo no documento */
export type Stroke = {
  tool: Tool;
  color: string;
  /** Largura em unidades de documento */
  width: number;
  points: Point[];
};

/**
 * Documento vetorial da folha de medição.
 * Todas as coordenadas de strokes são em pixels do espaço do documento.
 */
export type DrawingDocument = {
  /** Largura lógica em px (borda longa ≈ 2000) */
  width: number;
  /** Altura lógica em px */
  height: number;
  /** Imagem de fundo (template ou save anterior) – renderizada via contain */
  background: HTMLImageElement | null;
  strokes: Stroke[];
};

/**
 * Transformação para mapear coordenadas de documento → viewport.
 * viewport_x = docX * scale + offsetX
 */
export type ViewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Snapshot leve do histórico (apenas os strokes; background é imutável) */
export type HistoryEntry = Stroke[];

export const DOC_LONG_SIDE = 2000;
export const DOC_SHORT_SIDE = 1414; // ≈ A4 portrait 1.414
