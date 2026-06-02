const BR_PHONE_MAX_DIGITS = 11;

/** Extrai apenas dígitos do telefone (máx. 11 para BR) */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, BR_PHONE_MAX_DIGITS);
}

/** Formata telefone BR: (00)00000-0000 ou (00)0000-0000 */
export function formatBrPhone(value: string): string {
  return maskBrPhoneInput(value);
}

/** Aplica máscara (00)00000-0000 enquanto o usuário digita */
export function maskBrPhoneInput(raw: string): string {
  const digits = digitsOnlyPhone(raw);
  if (digits.length === 0) return "";

  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 10) {
    if (rest.length <= 4) return `(${ddd})${rest}`;
    return `(${ddd})${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  if (rest.length <= 5) return `(${ddd})${rest}`;
  return `(${ddd})${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

export function isCompleteBrPhone(value: string): boolean {
  const digits = digitsOnlyPhone(value);
  return digits.length === 10 || digits.length === 11;
}

/** Dígitos com DDI 55 para links wa.me */
export function phoneDigitsForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string): string | null {
  const e164 = phoneDigitsForWhatsApp(phone);
  if (!e164) return null;
  return `https://wa.me/${e164}`;
}
