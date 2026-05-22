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
