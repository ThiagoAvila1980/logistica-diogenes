const BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formata data no padrão DD/MM/YYYY */
export function formatBrDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  const parsed = typeof date === "string" ? parseBrDate(date) : date;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Interpreta DD/MM/YYYY (ou yyyy-MM-dd legado) em Date local */
export function parseBrDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const brMatch = BR_DATE_REGEX.exec(trimmed);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    return toValidLocalDate(day, month, year);
  }

  const isoMatch = ISO_DATE_REGEX.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return toValidLocalDate(day, month, year);
  }

  return null;
}

/** Aplica máscara DD/MM/YYYY enquanto o usuário digita */
export function maskBrDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isCompleteBrDate(value: string): boolean {
  return BR_DATE_REGEX.test(value.trim()) && parseBrDate(value) !== null;
}

/** Converte DD/MM/YYYY para yyyy-MM-dd (input nativo type=date) */
export function brDateToIso(value: string): string {
  const parsed = parseBrDate(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Converte yyyy-MM-dd para DD/MM/YYYY */
export function isoDateToBr(value: string): string {
  return formatBrDate(parseBrDate(value));
}

/** Data local no formato yyyy-MM-dd (ex.: para chave de observação diária) */
export function getLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toValidLocalDate(day: number, month: number, year: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
