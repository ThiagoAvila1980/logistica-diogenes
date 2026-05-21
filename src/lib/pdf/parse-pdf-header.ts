export const PDF_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const PDF_ALLOWED_MIME = new Set([
  "application/pdf",
]);

export type PdfHeaderData = {
  clientName: string | null;
  clientPhone: string | null;
  budgetReference: string | null;
  rawHeaderText: string;
};

/** Normaliza telefone brasileiro para comparação */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Extrai dados do cabeçalho de um PDF de orçamento (ficha Diógenes: NOME, TELEFONE, Nº) */
export function parsePdfHeaderText(text: string): PdfHeaderData {
  const headerLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);

  const headerText = headerLines.join("\n");
  const flat = headerText.replace(/\t/g, " ");

  const clientName =
    matchFirst(flat, [
      /NOME\s*:\s*(.+?)(?=\s+N[º°o]|$)/i,
      /(?:cliente|nome\s*(?:do\s*cliente)?)\s*[:\-–]\s*(.+?)(?=\s+N[º°o]|$)/i,
      /(?:raz[aã]o\s*social)\s*[:\-–]\s*(.+)/i,
    ]) ?? null;

  const clientPhone =
    matchFirst(flat, [
      /TELEFONE\s*:\s*(.+?)(?=\s+DATA\s*:|$)/i,
      /(?:telefone|tel\.?|celular|cel\.?|whatsapp|fone)\s*[:\-–]\s*([\(\)\d\s\-+]{8,20})/i,
      /(\(\d{2}\)\s*\d{4,5}[\-\s]?\d{4})/,
      /(\d{2}\s*\d{4,5}[\-\s]?\d{4})/,
    ]) ?? null;

  const budgetReference =
    matchFirst(flat, [
      /N[º°o]\s*:\s*([A-Z0-9\-\/\.]+)/i,
      /(?:or[cç]amento|orc\.?|n[º°o\.]\s*(?:do\s*)?or[cç]amento)\s*[:\-#]?\s*([A-Z0-9\-\/\.]+)/i,
      /(?:ref\.?|refer[eê]ncia)\s*[:\-–]\s*([A-Z0-9\-\/\.]+)/i,
    ]) ?? null;

  return {
    clientName: clientName ? cleanValue(clientName) : null,
    clientPhone: clientPhone ? cleanValue(clientPhone) : null,
    budgetReference: budgetReference ? cleanValue(budgetReference) : null,
    rawHeaderText: headerText,
  };
}

function matchFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function cleanValue(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}
