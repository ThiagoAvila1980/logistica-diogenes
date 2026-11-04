import type { ServicoEscopo } from "@/db/schema";

export const SERVICO_ESCOPOS = ["vao", "avulso"] as const;

export const SERVICO_ESCOPO_LABEL: Record<ServicoEscopo, string> = {
  vao: "No vão",
  avulso: "Avulso",
};

export type ServicoFormData = {
  id?: string;
  descricao: string;
  valor: string;
  tempo: string | null;
  meta: string | null;
  bonus: string | null;
  escopo: ServicoEscopo;
};

export type ServicoFormResult =
  | { ok: true; data: ServicoFormData }
  | { ok: false; message: string };

function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Aceita "50", "50,00" e "1.234,56". Devolve o valor com duas casas para o numeric. */
export function parseReais(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized).toFixed(2);
}

/** Valor para o campo do formulário, sem símbolo. */
export function reaisInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatReais(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function parseServicoForm(input: {
  id?: unknown;
  descricao?: unknown;
  valor?: unknown;
  tempo?: unknown;
  meta?: unknown;
  bonus?: unknown;
  escopo?: unknown;
}): ServicoFormResult {
  const descricao =
    typeof input.descricao === "string" ? input.descricao.trim() : "";
  if (descricao.length < 2) {
    return { ok: false, message: "Descrição obrigatória" };
  }
  if (descricao.length > 255) {
    return { ok: false, message: "Descrição muito longa" };
  }

  const valor = parseReais(
    typeof input.valor === "string" ? input.valor : "",
  );
  if (!valor) {
    return { ok: false, message: "Informe o valor em reais" };
  }

  const tempo = emptyToNull(input.tempo);
  const meta = emptyToNull(input.meta);
  if (tempo && tempo.length > 64) {
    return { ok: false, message: "Tempo muito longo" };
  }
  if (meta && meta.length > 64) {
    return { ok: false, message: "Meta muito longa" };
  }

  const bonusRaw = emptyToNull(input.bonus);
  const bonus = bonusRaw ? parseReais(bonusRaw) : null;
  if (bonusRaw && !bonus) {
    return { ok: false, message: "Informe o bônus em reais" };
  }

  const escopo = input.escopo;
  if (escopo !== "vao" && escopo !== "avulso") {
    return { ok: false, message: "Escolha onde o serviço entra" };
  }

  const id =
    typeof input.id === "string" && input.id.length > 0 ? input.id : undefined;

  return {
    ok: true,
    data: { id, descricao, valor, tempo, meta, bonus, escopo },
  };
}
