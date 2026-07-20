import { createCanvas, loadImage } from "@napi-rs/canvas";
import QRCode from "qrcode";
import type { LabelContent } from "@/lib/labels/build-label-zpl";
import type { LabelProfile } from "@/lib/labels/label-profile";
import { sanitizeTsplText } from "@/lib/labels/build-label-tspl";

/**
 * Prévia PNG alinhada ao layout TSPL (rótulo + valor; vão em 3 linhas).
 */
export async function renderLabelPreviewPng(
  content: LabelContent,
  profile: LabelProfile,
): Promise<Buffer> {
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
    ctx.font = `${bold ? "700" : "500"} ${size}px sans-serif`;
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
    ctx.font = `700 ${valueSize}px sans-serif`;
    ctx.fillText("QR", qrX + qrSize / 3, qrY + qrSize / 2.5);
  }

  ctx.font = `500 ${Math.round(labelSize * 0.9)}px sans-serif`;
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
