import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import type { OrderDetail } from "@/lib/data/types";
import type { FieldMeasurementDraft } from "@/lib/data/field";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import {
  resolveUploadDisplayUrl,
  storageKeyFromPersistedUrl,
} from "@/lib/upload/resolve-display-url";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import {
  getAlturas,
  getLarguras,
  hasExtraDimensions,
} from "@/lib/measurement/dimensions";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import type { DrawingItem, MeasurementLineItem } from "@/lib/workflow/schemas";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const DRAWING_COLUMN_WIDTH = 300;
const SPEC_COLUMN_X_OFFSET = DRAWING_COLUMN_WIDTH + 14;
const BLOCK_PADDING = 10;
const LINE_HEIGHT = 15;
const FONT_SIZE = 10;
/** Altura mínima da área de desenho por painel */
const SINGLE_PANEL_DRAWING_HEIGHT = 240;
const MULTI_PANEL_DRAWING_HEIGHT = 280;

const INK = rgb(0.15, 0.17, 0.2);
const MUTED = rgb(0.45, 0.48, 0.52);
const BORDER = rgb(0.75, 0.78, 0.8);

/** Remove caracteres fora do WinAnsi (Helvetica não suporta, ex.: emojis). */
function sanitizeText(value: string): string {
  return value.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of sanitizeText(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function loadPersistedImageBytes(url: string): Promise<Buffer | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    const base64 = trimmed.split(",")[1];
    return base64 ? Buffer.from(base64, "base64") : null;
  }

  const key = storageKeyFromPersistedUrl(trimmed);
  if (key) {
    try {
      return await readFile(path.join(process.cwd(), "public", "uploads", key));
    } catch {
      // não está no disco local — tentar storage remoto
    }
  }

  try {
    const resolved = await resolveUploadDisplayUrl(trimmed);
    if (/^https?:\/\//i.test(resolved)) {
      const res = await fetch(resolved);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } else if (resolved.startsWith("/uploads/")) {
      return await readFile(path.join(process.cwd(), "public", resolved.slice(1)));
    }
  } catch (err) {
    console.warn("[measurement-pdf] falha ao carregar imagem:", trimmed, err);
  }
  return null;
}

/** Converte qualquer formato (webp/png/jpg) para PNG com fundo branco. */
async function toPngBytes(input: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(input)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (err) {
    console.warn("[measurement-pdf] falha ao converter imagem:", err);
    return null;
  }
}

type PdfContext = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
};

function addPage(ctx: PdfContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function ensureVerticalSpace(ctx: PdfContext, height: number): void {
  if (ctx.y - height < MARGIN) {
    addPage(ctx);
  }
}

function drawLabelValue(
  ctx: PdfContext,
  x: number,
  y: number,
  label: string,
  value: string,
  options?: { size?: number; maxWidth?: number },
): void {
  const size = options?.size ?? FONT_SIZE;
  const labelText = sanitizeText(label);
  ctx.page.drawText(labelText, { x, y, size, font: ctx.bold, color: INK });
  const labelWidth = ctx.bold.widthOfTextAtSize(`${labelText} `, size);
  let valueText = sanitizeText(value);
  if (options?.maxWidth) {
    const available = options.maxWidth - labelWidth;
    if (ctx.font.widthOfTextAtSize(valueText, size) > available) {
      while (
        valueText.length > 1 &&
        ctx.font.widthOfTextAtSize(`${valueText}...`, size) > available
      ) {
        valueText = valueText.slice(0, -1).trimEnd();
      }
      valueText = `${valueText}...`;
    }
  }
  ctx.page.drawText(valueText, {
    x: x + labelWidth,
    y,
    size,
    font: ctx.font,
    color: INK,
  });
}

async function drawHeader(
  ctx: PdfContext,
  order: OrderDetail,
  draft: FieldMeasurementDraft | undefined,
): Promise<void> {
  const logoSize = 56;
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "logotipo.png"),
    );
    const resizedLogo = await sharp(logoBytes)
      .resize({ width: 256, height: 256, fit: "inside" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const logo = await ctx.doc.embedPng(resizedLogo);
    ctx.page.drawImage(logo, {
      x: MARGIN,
      y: ctx.y - logoSize,
      width: logoSize,
      height: logoSize,
    });
  } catch (err) {
    console.warn("[measurement-pdf] logotipo não encontrado:", err);
  }

  const infoX = MARGIN + logoSize + 16;
  const rightColX = MARGIN + CONTENT_WIDTH * 0.62;
  const displayNumber = getOrderDisplayNumber({
    number: order.number,
    budgetReference: order.budgetReference,
    numeroOrcamento: draft?.numeroOrcamento ?? null,
  });
  const clientName = draft?.cliente ?? order.clientName;
  const phone = draft?.telefone ?? order.clientPhone ?? "-";
  const address = (draft?.endereco ?? order.clientAddress)?.trim();
  const date = formatBrDate(order.scheduledDate ?? order.updatedAt) || "-";

  const headerStartY = ctx.y;
  const line1 = headerStartY - 22;
  const line2 = line1 - 18;
  drawLabelValue(ctx, infoX, line1, "Cliente:", clientName, {
    size: 11,
    maxWidth: rightColX - infoX - 10,
  });
  drawLabelValue(ctx, rightColX, line1, "Nº do orçamento:", displayNumber, {
    size: 11,
  });
  drawLabelValue(ctx, infoX, line2, "Telefone:", phone, { size: 11 });
  drawLabelValue(ctx, rightColX, line2, "Data:", date, { size: 11 });

  let contentBottom = line2 - 12;

  if (address) {
    const addressLabel = "Endereço:";
    const addressSize = 11;
    const labelWidth = ctx.bold.widthOfTextAtSize(
      `${sanitizeText(addressLabel)} `,
      addressSize,
    );
    const valueX = infoX + labelWidth;
    const wrapWidth = PAGE_WIDTH - MARGIN - valueX;
    const addressLines = wrapText(address, ctx.font, addressSize, wrapWidth);

    let addressY = line2 - 18;
    for (let i = 0; i < addressLines.length; i++) {
      if (i === 0) {
        ctx.page.drawText(sanitizeText(addressLabel), {
          x: infoX,
          y: addressY,
          size: addressSize,
          font: ctx.bold,
          color: INK,
        });
      }
      ctx.page.drawText(addressLines[i], {
        x: valueX,
        y: addressY,
        size: addressSize,
        font: ctx.font,
        color: INK,
      });
      addressY -= 14;
    }
    contentBottom = addressY + 2;
  }

  const blockBottom = Math.min(headerStartY - logoSize, contentBottom);
  ctx.y = blockBottom - 14;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 1,
    color: BORDER,
  });
  ctx.y -= 24;

  ctx.page.drawText("Medições", {
    x: MARGIN,
    y: ctx.y,
    size: 13,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= 20;
}

type SpecLine = {
  label: string;
  value: string;
  wrapped?: string[];
};

type MeasurementPanel = {
  drawing?: DrawingItem;
  dimensionIndex: number;
  showFullSpecs: boolean;
};

function getItemDrawings(item: MeasurementLineItem): DrawingItem[] {
  if (item.drawings && item.drawings.length > 0) return item.drawings;
  if (item.drawingUrl) return [{ id: "__legacy__", url: item.drawingUrl }];
  return [];
}

/** Divide a medição em painéis: cada desenho e cada medida extra ganham área própria. */
function buildMeasurementPanels(item: MeasurementLineItem): MeasurementPanel[] {
  const drawings = getItemDrawings(item);
  const larguras = getLarguras(item);
  const alturas = getAlturas(item);
  const hasExtras = hasExtraDimensions(item);
  const multiPanel = drawings.length > 1 || hasExtras;

  if (!multiPanel) {
    return [
      {
        drawing: drawings[0],
        dimensionIndex: 0,
        showFullSpecs: true,
      },
    ];
  }

  const panelCount = Math.max(
    drawings.length,
    hasExtras ? Math.max(larguras.length, alturas.length) : 1,
    1,
  );

  return Array.from({ length: panelCount }, (_, i) => ({
    drawing: drawings[i],
    dimensionIndex: i,
    showFullSpecs: i === 0,
  }));
}

function buildFullSpecLines(
  ctx: PdfContext,
  item: MeasurementLineItem,
  lookups: MeasurementLookups,
  specWidth: number,
  dimensionIndex: number,
): SpecLine[] {
  const ambiente = resolveLookupLabel(lookups.ambientes, item.idAmbiente) ?? "-";
  const cor = resolveLookupLabel(lookups.cores, item.idCor) ?? "-";
  const vidro = resolveLookupLabel(lookups.tipoVidro, item.idTipoVidro) ?? "-";
  const envidracamento =
    resolveLookupLabel(lookups.tipoEnvidracamento, item.idTipoEnvidracamento) ??
    "-";

  const larguras = getLarguras(item);
  const alturas = getAlturas(item);
  const largura = larguras[dimensionIndex];
  const altura = alturas[dimensionIndex];

  const lines: SpecLine[] = [
    { label: "Ambiente:", value: ambiente },
    { label: "Dimensões (mm)", value: "" },
    { label: "Quantidade:", value: item.qty > 0 ? String(item.qty) : "-" },
    {
      label: "Largura:",
      value: largura !== undefined ? String(largura) : "-",
    },
    { label: "Altura:", value: altura !== undefined ? String(altura) : "-" },
    { label: "Cor do Perfil:", value: cor },
    { label: "Vidro:", value: vidro },
    { label: "Tipo de Envidraçamento:", value: envidracamento },
  ];

  const observacao = item.observacao?.trim();
  lines.push({
    label: "Observações:",
    value: "",
    wrapped: observacao
      ? wrapText(observacao, ctx.font, FONT_SIZE, specWidth)
      : [],
  });

  return lines;
}

function buildExtraPanelSpecLines(
  item: MeasurementLineItem,
  panelIndex: number,
  dimensionIndex: number,
  hasDrawing: boolean,
): SpecLine[] {
  const larguras = getLarguras(item);
  const alturas = getAlturas(item);
  const largura = larguras[dimensionIndex];
  const altura = alturas[dimensionIndex];
  const hasDims = largura !== undefined || altura !== undefined;

  const lines: SpecLine[] = [];

  if (hasDims) {
    lines.push({ label: "Dimensões (mm)", value: "" });
    lines.push({
      label: "Quantidade:",
      value: item.qty > 0 ? String(item.qty) : "-",
    });
    lines.push({
      label: "Largura:",
      value: largura !== undefined ? String(largura) : "-",
    });
    lines.push({
      label: "Altura:",
      value: altura !== undefined ? String(altura) : "-",
    });
  } else if (hasDrawing) {
    lines.push({ label: `Desenho ${panelIndex + 1}`, value: "" });
  }

  return lines;
}

function specLinesHeight(lines: SpecLine[]): number {
  let count = 0;
  for (const line of lines) {
    count += 1;
    if (line.wrapped) count += line.wrapped.length;
  }
  return count * LINE_HEIGHT;
}

function panelDrawingHeight(panelCount: number): number {
  return panelCount > 1
    ? MULTI_PANEL_DRAWING_HEIGHT
    : SINGLE_PANEL_DRAWING_HEIGHT;
}

function computePanelHeight(
  specLines: SpecLine[],
  panelCount: number,
): number {
  const drawingHeight = panelDrawingHeight(panelCount);
  const textHeight = specLinesHeight(specLines) + BLOCK_PADDING * 2 + LINE_HEIGHT;
  return Math.max(drawingHeight + BLOCK_PADDING * 2, textHeight);
}

async function drawDrawingInArea(
  ctx: PdfContext,
  drawing: DrawingItem | undefined,
  placeholder: string,
  areaX: number,
  areaY: number,
  areaWidth: number,
  areaHeight: number,
): Promise<void> {
  if (!drawing) {
    const width = ctx.font.widthOfTextAtSize(placeholder, FONT_SIZE);
    ctx.page.drawText(placeholder, {
      x: areaX + (areaWidth - width) / 2,
      y: areaY + areaHeight / 2 - FONT_SIZE / 2,
      size: FONT_SIZE,
      font: ctx.font,
      color: MUTED,
    });
    return;
  }

  const bytes = await loadPersistedImageBytes(drawing.url);
  const png = bytes ? await toPngBytes(bytes) : null;
  if (!png) {
    const width = ctx.font.widthOfTextAtSize(placeholder, FONT_SIZE);
    ctx.page.drawText(placeholder, {
      x: areaX + (areaWidth - width) / 2,
      y: areaY + areaHeight / 2 - FONT_SIZE / 2,
      size: FONT_SIZE,
      font: ctx.font,
      color: MUTED,
    });
    return;
  }

  try {
    const image = await ctx.doc.embedPng(png);
    const scale = Math.min(areaWidth / image.width, areaHeight / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.page.drawImage(image, {
      x: areaX + (areaWidth - w) / 2,
      y: areaY + (areaHeight - h) / 2,
      width: w,
      height: h,
    });
  } catch (err) {
    console.warn("[measurement-pdf] falha ao embutir desenho:", err);
  }
}

function drawSpecLines(
  ctx: PdfContext,
  specLines: SpecLine[],
  specX: number,
  top: number,
  specWidth: number,
): void {
  let textY = top - BLOCK_PADDING - FONT_SIZE;
  for (const line of specLines) {
    if (line.value) {
      drawLabelValue(ctx, specX, textY, line.label, line.value, {
        maxWidth: specWidth,
      });
    } else {
      ctx.page.drawText(sanitizeText(line.label), {
        x: specX,
        y: textY,
        size: FONT_SIZE,
        font: ctx.bold,
        color: INK,
      });
    }
    textY -= LINE_HEIGHT;
    if (line.wrapped) {
      for (const wrappedLine of line.wrapped) {
        ctx.page.drawText(wrappedLine, {
          x: specX,
          y: textY,
          size: FONT_SIZE,
          font: ctx.font,
          color: INK,
        });
        textY -= LINE_HEIGHT;
      }
    }
  }
}

async function drawMeasurementPanel(
  ctx: PdfContext,
  item: MeasurementLineItem,
  itemIndex: number,
  panel: MeasurementPanel,
  panelIndex: number,
  panelCount: number,
  lookups: MeasurementLookups,
): Promise<void> {
  const specWidth = CONTENT_WIDTH - SPEC_COLUMN_X_OFFSET - BLOCK_PADDING;
  const specLines = panel.showFullSpecs
    ? buildFullSpecLines(ctx, item, lookups, specWidth, panel.dimensionIndex)
    : buildExtraPanelSpecLines(
        item,
        panelIndex,
        panel.dimensionIndex,
        Boolean(panel.drawing),
      );
  const panelHeight = computePanelHeight(specLines, panelCount);

  ensureVerticalSpace(ctx, panelHeight + 16);

  const panelTop = ctx.y;
  const panelBottom = panelTop - panelHeight;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: panelBottom,
    width: CONTENT_WIDTH,
    height: panelHeight,
    borderColor: BORDER,
    borderWidth: 1,
  });

  ctx.page.drawLine({
    start: { x: MARGIN + DRAWING_COLUMN_WIDTH, y: panelBottom },
    end: { x: MARGIN + DRAWING_COLUMN_WIDTH, y: panelTop },
    thickness: 1,
    color: BORDER,
  });

  const drawingAreaHeight = panelDrawingHeight(panelCount);
  const areaX = MARGIN + BLOCK_PADDING;
  const areaWidth = DRAWING_COLUMN_WIDTH - BLOCK_PADDING * 2;
  const areaY = panelBottom + BLOCK_PADDING;

  await drawDrawingInArea(
    ctx,
    panel.drawing,
    `[Espaço para desenho ${itemIndex + 1}${panelCount > 1 ? `.${panelIndex + 1}` : ""}]`,
    areaX,
    areaY,
    areaWidth,
    drawingAreaHeight,
  );

  drawSpecLines(
    ctx,
    specLines,
    MARGIN + SPEC_COLUMN_X_OFFSET,
    panelTop,
    specWidth,
  );

  ctx.y = panelBottom - 16;
}

async function drawMeasurementBlock(
  ctx: PdfContext,
  item: MeasurementLineItem,
  itemIndex: number,
  lookups: MeasurementLookups,
): Promise<void> {
  const panels = buildMeasurementPanels(item);

  for (let panelIndex = 0; panelIndex < panels.length; panelIndex++) {
    await drawMeasurementPanel(
      ctx,
      item,
      itemIndex,
      panels[panelIndex],
      panelIndex,
      panels.length,
      lookups,
    );
  }
}

export async function generateMeasurementPdf(
  order: OrderDetail,
  draft: FieldMeasurementDraft | undefined,
  lookups: MeasurementLookups,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: PdfContext = {
    doc,
    font,
    bold,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  };

  await drawHeader(ctx, order, draft);

  const items = sortMeasurementItemsOldestFirst(draft?.items ?? []);
  if (items.length === 0) {
    ctx.page.drawText("Nenhuma medição registrada.", {
      x: MARGIN,
      y: ctx.y,
      size: FONT_SIZE,
      font,
      color: MUTED,
    });
  } else {
    for (let i = 0; i < items.length; i++) {
      await drawMeasurementBlock(ctx, items[i], i, lookups);
    }
  }

  return doc.save();
}
