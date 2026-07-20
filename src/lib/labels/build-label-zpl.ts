import {
  mmToDots,
  type LabelProfile,
} from "@/lib/labels/label-profile";

export type LabelContent = {
  clientName: string;
  budgetNumber: string;
  clientPhone: string;
  clientAddress: string;
  vaoNumber: number;
  /** Ambiente (ex.: AREA EXTERNA) */
  ambiente: string;
  /** Tipo de envidraçamento (ex.: Sacada Reiki) */
  envidracamento: string;
  /** Spec legado: ambiente — envidraçamento (compat / preview textual) */
  vaoSpec: string;
  vaoDims: string;
  qrPayload: string;
};

/**
 * ZPL usa ^ e ~ como controles. Normaliza texto para ASCII seguro
 * na impressora térmica (sem acentos problemáticos / circumflexos).
 */
export function sanitizeZplText(value: string): string {
  return value
    .replace(/×/g, "x")
    .replace(/[—–−]/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^^\x20-\x7E]/g, "?")
    .replace(/\^/g, " ")
    .replace(/~/g, "-")
    .trim();
}

function fd(text: string): string {
  return `^FD${sanitizeZplText(text)}^FS`;
}

/**
 * Monta comando ZPL para etiqueta de vão (fallback / emulação ZPL).
 */
export function buildLabelZpl(
  content: LabelContent,
  profile: LabelProfile,
): string {
  const width = mmToDots(profile.widthMm, profile.dpi);
  const height = mmToDots(profile.heightMm, profile.dpi);
  const margin = 40;
  const lineH = 40;
  let y = margin;

  const lines: string[] = [
    "^XA",
    `^PW${width}`,
    `^LL${height}`,
    "^LH0,0",
    "^CI28",
  ];

  const pushText = (text: string, size = 32) => {
    lines.push(`^FO${margin},${y}^A0N,${size},${size}${fd(text)}`);
    y += lineH;
  };

  const pushField = (label: string, value: string) => {
    pushText(label, 28);
    pushText(value || "-", 34);
    y += 8;
  };

  pushField("Cliente:", content.clientName);
  pushField("Orcamento:", content.budgetNumber);
  pushField("Telefone:", content.clientPhone);
  pushField("Endereco:", content.clientAddress);

  y += 8;
  pushText(`Vao ${content.vaoNumber}`, 40);
  pushText(content.ambiente || "-", 34);
  pushText(content.envidracamento || "-", 34);
  if (content.vaoDims) {
    pushText(content.vaoDims, 34);
  }

  const qrSize = 8;
  const qrY = Math.max(y + 40, height - 420);
  const qrPayload = sanitizeZplText(content.qrPayload);
  lines.push(`^FO${margin},${qrY}^BQN,2,${qrSize}^FDQA,${qrPayload}^FS`);
  lines.push("^XZ");
  return lines.join("\n");
}

export function buildVaoQrPayload(itemId: string): string {
  return `DIO:VAO:${itemId}`;
}
