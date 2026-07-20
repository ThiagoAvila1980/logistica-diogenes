import type { LabelContent } from "@/lib/labels/build-label-zpl";
import {
  mmToDots,
  type LabelProfile,
} from "@/lib/labels/label-profile";

/**
 * ASCII seguro para TSPL: remove aspas/controles que abortam o job
 * no meio da etiqueta (ex.: linha do ambiente).
 */
export function sanitizeTsplText(value: string): string {
  return value
    .replace(/×/g, "x")
    .replace(/[—–−]/g, "-")
    .replace(/[“”«»]/g, "'")
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/"/g, "'")
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function fitLine(text: string, maxChars: number): string {
  const s = sanitizeTsplText(text);
  if (!s) return "-";
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(1, maxChars - 3))}...`;
}

/**
 * Monta comando TSPL.
 * Cabeçalho: rótulo numa linha, valor na seguinte (fonte ~30% menor que a versão “cheia”).
 * Vão: Ambiente → tipo envidraçamento → medidas.
 */
export function buildLabelTspl(
  content: LabelContent,
  profile: LabelProfile,
): string {
  const widthDots = mmToDots(profile.widthMm, profile.dpi);
  const heightDots = mmToDots(profile.heightMm, profile.dpi);
  const margin = 48;
  // mul ~1.4≈2 com passo menor; ~30% abaixo da versão “estourada” (mul 2–3)
  const maxChars = Math.max(24, Math.floor((widthDots - margin * 2) / 16));
  const gap = Number.isFinite(profile.gapMm) ? profile.gapMm : 2;
  const direction = profile.direction === 1 ? 1 : 0;

  const qrCell = 7;
  const qrBlock = 250;
  const bottomPad = 36;
  const qrYMax = heightDots - qrBlock - bottomPad;

  const lines: string[] = [
    `SIZE ${profile.widthMm} mm, ${profile.heightMm} mm`,
    gap > 0 ? `GAP ${gap} mm, 0 mm` : "GAP 0 mm, 0 mm",
    `DIRECTION ${direction}`,
    "REFERENCE 0,0",
    "CLS",
  ];

  let y = margin;
  const x = margin;

  const pushText = (
    text: string,
    opts?: { font?: string; xMul?: number; yMul?: number; step?: number },
  ) => {
    const font = opts?.font ?? "3";
    const xMul = opts?.xMul ?? 2;
    const yMul = opts?.yMul ?? 2;
    const step = opts?.step ?? yMul * 22 + 12;
    if (y + step > qrYMax - 16) return;
    const line = fitLine(text, maxChars);
    lines.push(`TEXT ${x},${y},"${font}",0,${xMul},${yMul},"${line}"`);
    y += step;
  };

  /** Rótulo pequeno + valor maior na linha de baixo */
  const pushField = (label: string, value: string) => {
    pushText(label, { font: "2", xMul: 2, yMul: 2, step: 48 });
    pushText(value || "-", { font: "3", xMul: 2, yMul: 2, step: 62 });
    y += 8;
  };

  pushField("Cliente:", content.clientName);
  pushField("Orcamento:", content.budgetNumber);
  pushField("Telefone:", content.clientPhone);
  pushField("Endereco:", content.clientAddress);

  y += 16;
  pushText(`Vao ${content.vaoNumber}`, {
    font: "3",
    xMul: 2,
    yMul: 2,
    step: 70,
  });
  pushText(content.ambiente || "-", { xMul: 2, yMul: 2, step: 62 });
  pushText(content.envidracamento || "-", { xMul: 2, yMul: 2, step: 62 });
  if (content.vaoDims) {
    pushText(content.vaoDims, { xMul: 2, yMul: 2, step: 62 });
  }

  const qrY = Math.min(Math.max(y + 28, Math.round(heightDots * 0.58)), qrYMax);
  const qrPayload = fitLine(content.qrPayload, 80);
  lines.push(`QRCODE ${x},${qrY},L,${qrCell},A,0,"${qrPayload}"`);
  lines.push("PRINT 1,1");

  return `${lines.join("\r\n")}\r\n`;
}
