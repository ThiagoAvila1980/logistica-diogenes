import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import type { LabelContent } from "@/lib/labels/build-label-zpl";
import type { LabelProfile } from "@/lib/labels/label-profile";
import { sanitizeTsplText } from "@/lib/labels/build-label-tspl";

const FONT_REGULAR = "DiogenesLabel";
const FONT_BOLD = "DiogenesLabelBold";

let fontsReady = false;

function ensurePreviewFonts() {
  if (fontsReady) return;
  const dir = join(process.cwd(), "assets", "fonts");
  const regular = join(dir, "DejaVuSans.ttf");
  const bold = join(dir, "DejaVuSans-Bold.ttf");

  if (existsSync(regular)) {
    GlobalFonts.registerFromPath(regular, FONT_REGULAR);
  }
  if (existsSync(bold)) {
    GlobalFonts.registerFromPath(bold, FONT_BOLD);
  }
  fontsReady = true;
}

function fontCss(size: number, bold: boolean) {
  const family = bold ? FONT_BOLD : FONT_REGULAR;
  // Fallback se a TTF não estiver no deploy
  return `${bold ? "700" : "500"} ${size}px ${family}, DejaVu Sans, sans-serif`;
}

/**
 * Prévia PNG alinhada ao layout TSPL (rótulo + valor; vão em 3 linhas).
 */
export async function renderLabelPreviewPng(
  content: LabelContent,
  profile: LabelProfile,
): Promise<Buffer> {
  ensurePreviewFonts();

  const pxPerMm = 3.8;
  const width = Math.round(profile.widthMm * pxPerMm);
  const height = Math.round(profile.heightMm * pxPerMm);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  const pad = Math.round(width * 0.07);
  let y = pad;
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";

  const drawLine = (text: string, size: number, bold = false) => {
    ctx.font = fontCss(size, bold);
    const safe = sanitizeTsplText(text) || "-";
    ctx.fillText(safe, pad, y, width - pad * 2);
    y += size + Math.round(size * 0.28);
  };

  const labelSize = Math.round(height * 0.032);
  const valueSize = Math.round(height * 0.042);
  const vaoTitle = Math.round(height * 0.05);

  const drawField = (label: string, value: string) => {
    drawLine(label, labelSize, true);
    drawLine(value || "-", valueSize);
    y += Math.round(labelSize * 0.35);
  };

  drawField("Cliente:", content.clientName);
  drawField("Orcamento:", content.budgetNumber);
  drawField("Telefone:", content.clientPhone);
  drawField("Endereco:", content.clientAddress);

  y += Math.round(valueSize * 0.35);
  drawLine(`Vao ${content.vaoNumber}`, vaoTitle, true);
  drawLine(content.ambiente || "-", valueSize);
  drawLine(content.envidracamento || "-", valueSize);
  if (content.vaoDims) drawLine(content.vaoDims, valueSize);

  const qrSize = Math.round(Math.min(width, height) * 0.34);
  const qrX = pad;
  const qrY = Math.min(
    Math.max(y + Math.round(valueSize * 0.4), Math.round(height * 0.58)),
    height - qrSize - pad,
  );

  try {
    const qrPng = await QRCode.toBuffer(content.qrPayload, {
      type: "png",
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    const img = await loadImage(qrPng);
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
  } catch {
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    ctx.font = fontCss(valueSize, true);
    ctx.fillText("QR", qrX + qrSize / 3, qrY + qrSize / 2.5);
  }

  ctx.font = fontCss(Math.round(labelSize * 0.9), false);
  ctx.fillStyle = "#555555";
  ctx.fillText(
    `${profile.widthMm}x${profile.heightMm}mm`,
    pad,
    height - pad * 0.9,
    width - pad * 2,
  );

  return canvas.toBuffer("image/png");
}

export async function renderLabelPreviewDataUrl(
  content: LabelContent,
  profile: LabelProfile,
): Promise<string> {
  const buf = await renderLabelPreviewPng(content, profile);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
