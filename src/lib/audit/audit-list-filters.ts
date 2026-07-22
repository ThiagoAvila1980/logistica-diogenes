import { parseBrDate } from "@/lib/date-format";

export type AuditListSearchParamsInput = {
  os?: string;
  measurementId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
};

export type ParsedAuditListFilters = {
  osNumber?: string;
  measurementId?: string;
  actorId?: string;
  action?: string;
  from: Date | null;
  to: Date | null;
  page: number;
  pageSize: number;
};

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "all") return undefined;
  return trimmed;
}

function parseDayBoundary(
  value: string | undefined,
  boundary: "start" | "end",
): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = parseBrDate(trimmed);
  if (!parsed) return null;
  if (boundary === "start") {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

/** Interpreta query string de `/admin/auditoria` em filtros tipados. */
export function parseAuditListSearchParams(
  params: AuditListSearchParamsInput,
): ParsedAuditListFilters {
  const pageRaw = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    osNumber: emptyToUndefined(params.os),
    measurementId: emptyToUndefined(params.measurementId),
    actorId: emptyToUndefined(params.actorId),
    action: emptyToUndefined(params.action),
    from: parseDayBoundary(params.from, "start"),
    to: parseDayBoundary(params.to, "end"),
    page,
    pageSize: 50,
  };
}

export type AuditOsSearchFields = {
  number?: string | null;
  numeroOrcamento?: string | null;
  budgetReference?: string | null;
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Compara o texto digitado com os identificadores visíveis da OS. */
export function matchesAuditOsSearch(
  order: AuditOsSearchFields,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const candidates = [order.number, order.numeroOrcamento, order.budgetReference];
  return candidates.some((value) =>
    normalizeSearchText(value ?? "").includes(normalizedQuery),
  );
}

/** Escapa `%` e `_` para uso seguro em ILIKE. */
export function buildAuditOsSearchPattern(osNumber: string): string {
  const escaped = osNumber
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}
