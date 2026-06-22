import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatBrDate, formatBrDateTime } from "@/lib/date-format";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import { REPORT_PHASE_LABELS } from "@/lib/reports/service-journey";
import type { ServiceJourneyRow } from "@/lib/reports/service-journey";
import type { ServiceReportFilters } from "@/lib/reports/service-report-filters";

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.42, 0.45, 0.5);
const BORDER = rgb(0.82, 0.84, 0.86);
const HEADER_BG = rgb(0.94, 0.95, 0.96);

const COL_WIDTHS = [88, 120, 58, 68, 92, CONTENT_WIDTH - 426];

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
  return lines.length > 0 ? lines : [""];
}

function formatJourneyLine(row: ServiceJourneyRow): string {
  return row.phases
    .map((phase) => {
      if (phase.state === "pending") return `${phase.shortTitle} (pend.)`;
      const suffix = phase.state === "current" ? " (atual)" : "";
      return `${phase.shortTitle}${suffix}`;
    })
    .join(" -> ");
}

function describeFilters(filters: ServiceReportFilters): string {
  const parts: string[] = [];
  if (filters.search.trim()) parts.push(`Busca: ${filters.search.trim()}`);
  if (filters.priority !== "all") parts.push(`Prioridade: ${filters.priority}`);
  if (filters.stage !== "all") {
    parts.push(`Etapa: ${REPORT_PHASE_LABELS[filters.stage] ?? filters.stage}`);
  }
  if (filters.dateFrom) parts.push(`De: ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`Até: ${filters.dateTo}`);
  return parts.length > 0 ? parts.join(" · ") : "Sem filtros aplicados";
}

function drawTableHeader(page: PDFPage, fontBold: PDFFont, y: number): number {
  const headers = [
    "Nº / Orç.",
    "Cliente",
    "Prior.",
    "Agenda.",
    "Etapa atual",
    "Jornada",
  ];
  let x = MARGIN;
  page.drawRectangle({
    x: MARGIN,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: HEADER_BG,
    borderColor: BORDER,
    borderWidth: 0.5,
  });

  for (let i = 0; i < headers.length; i++) {
    page.drawText(sanitizeText(headers[i]!), {
      x: x + 4,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: INK,
    });
    x += COL_WIDTHS[i]!;
  }

  return y - 22;
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  row: ServiceJourneyRow,
  y: number,
): { page: PDFPage; y: number } {
  const values = [
    row.displayNumber,
    row.clientName,
    row.priority,
    row.scheduledDate ? formatBrDate(row.scheduledDate) : "—",
    `${row.currentPhaseTitle}\n${row.currentStatusLabel}`,
    formatJourneyLine(row),
  ];

  const cellLines = values.map((value, index) =>
    wrapText(value, font, 8, COL_WIDTHS[index]! - 8),
  );
  const rowHeight = Math.max(...cellLines.map((lines) => lines.length)) * 11 + 8;

  if (y - rowHeight < MARGIN + 24) {
    return { page, y: -1 };
  }

  page.drawRectangle({
    x: MARGIN,
    y: y - rowHeight,
    width: CONTENT_WIDTH,
    height: rowHeight,
    borderColor: BORDER,
    borderWidth: 0.5,
  });

  let x = MARGIN;
  for (let col = 0; col < values.length; col++) {
    let lineY = y - 10;
    for (const line of cellLines[col]!) {
      page.drawText(line, {
        x: x + 4,
        y: lineY,
        size: 8,
        font,
        color: col === 5 ? MUTED : INK,
      });
      lineY -= 11;
    }
    x += COL_WIDTHS[col]!;
  }

  return { page, y: y - rowHeight };
}

export async function generateServiceJourneyPdf(input: {
  rows: ServiceJourneyRow[];
  filters: ServiceReportFilters;
  generatedAt: Date;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText("Relatorio de jornada dos servicos", {
    x: MARGIN,
    y,
    size: 14,
    font: fontBold,
    color: INK,
  });
  y -= 18;

  page.drawText(
    sanitizeText(
      `Gerado em ${formatBrDateTime(input.generatedAt)} · ${input.rows.length} servico(s)`,
    ),
    {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: MUTED,
    },
  );
  y -= 14;

  page.drawText(sanitizeText(describeFilters(input.filters)), {
    x: MARGIN,
    y,
    size: 8,
    font,
    color: MUTED,
  });
  y -= 22;

  y = drawTableHeader(page, fontBold, y);

  for (const row of input.rows) {
    let result = drawRow(page, font, row, y);
    if (result.y < 0) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 12;
      y = drawTableHeader(page, fontBold, y);
      result = drawRow(page, font, row, y);
    }
    y = result.y;
  }

  return pdf.save();
}
