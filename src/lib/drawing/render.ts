import type { DrawingDocument, Stroke, ViewTransform } from "./types";
import { canvasToDrawingDataUrl } from "@/lib/upload/canvas-export";

// ---------------------------------------------------------------------------
// Transformação de coordenadas
// ---------------------------------------------------------------------------

/**
 * Calcula a ViewTransform "contain" que encaixa o documento no box de viewport,
 * centralizado, sem distorção, com zoom e pan adicionais.
 */
export function computeFit(
  docW: number,
  docH: number,
  boxW: number,
  boxH: number,
  zoom = 1,
  panX = 0,
  panY = 0,
): ViewTransform {
  if (docW <= 0 || docH <= 0 || boxW <= 0 || boxH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const baseScale = Math.min(boxW / docW, boxH / docH);
  const scale = baseScale * zoom;

  const scaledW = docW * scale;
  const scaledH = docH * scale;

  return {
    scale,
    offsetX: (boxW - scaledW) / 2 + panX,
    offsetY: (boxH - scaledH) / 2 + panY,
  };
}

/** Converte ponto do viewport (CSS px) para coordenadas do documento */
export function viewportToDoc(
  vx: number,
  vy: number,
  view: ViewTransform,
): { x: number; y: number } {
  return {
    x: (vx - view.offsetX) / view.scale,
    y: (vy - view.offsetY) / view.scale,
  };
}

/** Converte ponto do documento para coordenadas do viewport (CSS px) */
export function docToViewport(
  dx: number,
  dy: number,
  view: ViewTransform,
): { x: number; y: number } {
  return {
    x: dx * view.scale + view.offsetX,
    y: dy * view.scale + view.offsetY,
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Renderiza a cena completa no ctx.
 * O ctx deve estar configurado com setTransform(dpr, 0, 0, dpr, 0, 0).
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  doc: DrawingDocument,
  view: ViewTransform,
  /** Largura do viewport em CSS px */
  boxW: number,
  /** Altura do viewport em CSS px */
  boxH: number,
): void {
  if (boxW <= 0 || boxH <= 0) return;

  const { scale, offsetX, offsetY } = view;
  const docW = doc.width * scale;
  const docH = doc.height * scale;

  // Limpa tudo
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  // Preenche o viewport com o fundo
  ctx.save();
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, boxW, boxH);

  // Folha branca
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(offsetX, offsetY, docW, docH);

  // Sombra da folha
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 8;
  ctx.fillRect(offsetX, offsetY, docW, docH);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Background (imagem de referência / save anterior) — contain dentro da folha
  if (doc.background) {
    const img = doc.background;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const docAspect = doc.width / doc.height;
    let bw: number, bh: number;
    if (imgAspect > docAspect) {
      bw = docW;
      bh = docW / imgAspect;
    } else {
      bh = docH;
      bw = docH * imgAspect;
    }
    const bx = offsetX + (docW - bw) / 2;
    const by = offsetY + (docH - bh) / 2;
    ctx.drawImage(img, bx, by, bw, bh);
  }

  ctx.restore();

  // Clip para a folha
  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, docW, docH);
  ctx.clip();

  // Strokes
  for (const stroke of doc.strokes) {
    renderStroke(ctx, stroke, view);
  }

  ctx.restore();
}

function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  view: ViewTransform,
): void {
  if (stroke.points.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width * view.scale;

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000000";
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  const first = stroke.points[0]!;
  const fp = docToViewport(first.x, first.y, view);
  ctx.moveTo(fp.x, fp.y);

  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i]!;
    const vp = docToViewport(p.x, p.y, view);
    ctx.lineTo(vp.x, vp.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Exportação em resolução nativa do documento
// ---------------------------------------------------------------------------

/**
 * Exporta o documento numa resolução de alta qualidade (escala 2×),
 * independente do viewport atual.
 * Retorna dataURL WebP (ou PNG como fallback).
 */
export function exportDocument(doc: DrawingDocument): string {
  const exportScale = 2;
  const w = doc.width * exportScale;
  const h = doc.height * exportScale;

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return "";

  const view: ViewTransform = {
    scale: exportScale,
    offsetX: 0,
    offsetY: 0,
  };

  // Fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Background (contain)
  if (doc.background) {
    const img = doc.background;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const docAspect = doc.width / doc.height;
    let bw: number, bh: number;
    if (imgAspect > docAspect) {
      bw = w;
      bh = w / imgAspect;
    } else {
      bh = h;
      bw = h * imgAspect;
    }
    const bx = (w - bw) / 2;
    const by = (h - bh) / 2;
    ctx.drawImage(img, bx, by, bw, bh);
  }

  // Strokes
  for (const stroke of doc.strokes) {
    renderStroke(ctx, stroke, view);
  }

  return canvasToDrawingDataUrl(offscreen);
}

// ---------------------------------------------------------------------------
// Rotação de documento (vetorial — sem distorção)
// ---------------------------------------------------------------------------

/**
 * Rotaciona o documento 90° (horário ou anti-horário).
 * Troca width/height e transforma os pontos de cada stroke.
 */
export function rotateDocument(
  doc: DrawingDocument,
  clockwise: boolean,
): DrawingDocument {
  const { width: W, height: H } = doc;

  function rotatePoint(p: { x: number; y: number }): { x: number; y: number } {
    if (clockwise) {
      return { x: H - p.y, y: p.x };
    }
    return { x: p.y, y: W - p.x };
  }

  const strokes = doc.strokes.map((s) => ({
    ...s,
    points: s.points.map(rotatePoint),
  }));

  return {
    ...doc,
    width: H,
    height: W,
    strokes,
  };
}
