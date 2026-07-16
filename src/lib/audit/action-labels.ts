import { AUDIT_ACTIONS, type AuditAction } from "./actions";
import { TRANSPORT_STEP_LABELS } from "@/lib/logistics/transport-step-assignment";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.CUTTING_STEP_CHECKED]: "Corte marcado",
  [AUDIT_ACTIONS.CUTTING_STEP_UNCHECKED]: "Corte desmarcado",
  [AUDIT_ACTIONS.CUTTING_NOTES_UPDATED]: "Observações de corte atualizadas",
  [AUDIT_ACTIONS.CUTTING_DRAWING_UPDATED]: "Desenho atualizado",
  [AUDIT_ACTIONS.CUTTING_ITEMS_SENT]: "Itens enviados ao corte",

  [AUDIT_ACTIONS.TRANSPORT_STEP_CHECKED]: "Transporte marcado",
  [AUDIT_ACTIONS.TRANSPORT_STEP_UNCHECKED]: "Transporte desmarcado",
  [AUDIT_ACTIONS.TRANSPORT_DRIVER_ASSIGNED]: "Motorista atribuído",
  [AUDIT_ACTIONS.TRANSPORT_DRIVER_UNASSIGNED]: "Motorista removido",
  [AUDIT_ACTIONS.TRANSPORT_VEHICLE_ASSIGNED]: "Veículo atribuído",
  [AUDIT_ACTIONS.TRANSPORT_VEHICLE_UNASSIGNED]: "Veículo removido",
  [AUDIT_ACTIONS.TRANSPORT_NOTES_UPDATED]: "Observações de transporte atualizadas",

  [AUDIT_ACTIONS.INSTALLATION_STEP_CHECKED]: "Instalação marcada",
  [AUDIT_ACTIONS.INSTALLATION_STEP_UNCHECKED]: "Instalação desmarcada",
  [AUDIT_ACTIONS.INSTALLATION_VAO_COMPLETED]: "Vão concluído",
  [AUDIT_ACTIONS.INSTALLATION_INSTALLER_ASSIGNED]: "Instalador atribuído",
  [AUDIT_ACTIONS.INSTALLATION_INSTALLER_UNASSIGNED]: "Instalador removido",
  [AUDIT_ACTIONS.INSTALLATION_NOTES_UPDATED]: "Observações de instalação atualizadas",
  [AUDIT_ACTIONS.INSTALLATION_PHOTOS_UPDATED]: "Fotos atualizadas",
  [AUDIT_ACTIONS.INSTALLATION_VAOS_SENT]: "Vãos enviados à instalação",

  [AUDIT_ACTIONS.FIELD_MEASUREMENT_CREATED]: "Medição criada",
  [AUDIT_ACTIONS.FIELD_MEASUREMENT_SAVED]: "Medição salva",
  [AUDIT_ACTIONS.FIELD_HEADER_UPDATED]: "Cabeçalho atualizado",
  [AUDIT_ACTIONS.FIELD_MEASUREMENT_DELETED]: "Medição excluída",

  [AUDIT_ACTIONS.OS_STAGE_CHANGED]: "Etapa alterada",
  [AUDIT_ACTIONS.OS_STAGE_REVERTED]: "Etapa revertida",

  [AUDIT_ACTIONS.ADMIN_USER_CREATED]: "Usuário criado",
  [AUDIT_ACTIONS.ADMIN_USER_UPDATED]: "Usuário atualizado",
  [AUDIT_ACTIONS.ADMIN_USER_DELETED]: "Usuário excluído",
  [AUDIT_ACTIONS.ADMIN_VEHICLE_CREATED]: "Veículo criado",
  [AUDIT_ACTIONS.ADMIN_VEHICLE_UPDATED]: "Veículo atualizado",
  [AUDIT_ACTIONS.ADMIN_VEHICLE_DELETED]: "Veículo excluído",
  [AUDIT_ACTIONS.ADMIN_LOOKUP_CREATED]: "Cadastro criado",
  [AUDIT_ACTIONS.ADMIN_LOOKUP_UPDATED]: "Cadastro atualizado",
  [AUDIT_ACTIONS.ADMIN_LOOKUP_DELETED]: "Cadastro excluído",
  [AUDIT_ACTIONS.ADMIN_ROLE_ACCESS_UPDATED]: "Permissões atualizadas",
  [AUDIT_ACTIONS.ADMIN_SCORING_RULE_UPDATED]: "Regra de pontuação atualizada",

  [AUDIT_ACTIONS.PEDIDO_UPDATED]: "Pedido atualizado",
};

const CUTTING_STEP_LABELS: Record<string, string> = {
  corte: "Corte",
  embalagem: "Embalagem",
  acessorios: "Acessórios",
  vidros: "Vidros",
};

const INSTALLATION_STEP_LABELS: Record<string, string> = {
  estrutural: "Estrutural",
  vidros: "Vidros",
  acabamento: "Acabamento",
};

const OS_STATUS_LABELS: Record<string, string> = {
  medida: "Medida",
  cortes: "Cortes",
  transporte_perfil: "Transporte perfil",
  transporte_acessorios: "Transporte acessórios",
  transporte_vidros: "Transporte vidros",
  instalacao: "Instalação",
  concluido: "Concluído",
};

const LOOKUP_LABELS: Record<string, string> = {
  tipo_envidracamento: "Tipo de envidraçamento",
};

function formatOsStatus(status: unknown): string {
  if (typeof status !== "string" || !status) return "";
  return OS_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function formatStepLabel(step: unknown): string {
  if (typeof step !== "string" || !step) return "";
  return (
    TRANSPORT_STEP_LABELS[step as keyof typeof TRANSPORT_STEP_LABELS] ??
    CUTTING_STEP_LABELS[step] ??
    INSTALLATION_STEP_LABELS[step] ??
    step
  );
}

function formatLookupLabel(lookup: unknown): string {
  if (typeof lookup !== "string" || !lookup) return "";
  return LOOKUP_LABELS[lookup] ?? lookup.replace(/_/g, " ");
}

function formatIdArray(ids: unknown, singular: string, plural: string): string {
  if (!Array.isArray(ids) || ids.length === 0) return "";
  return ids.length === 1 ? `1 ${singular}` : `${ids.length} ${plural}`;
}

function formatAdminFields(fields: unknown): string {
  if (!Array.isArray(fields) || fields.length === 0) return "";
  return fields
    .filter((field): field is string => typeof field === "string" && field.length > 0)
    .join(", ");
}

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action;
}

export function formatAuditPayloadSummary(
  action: string,
  payload: Record<string, unknown> | null | undefined,
): string {
  if (!payload || Object.keys(payload).length === 0) return "";

  const parts: string[] = [];

  const step = payload.step;
  if (step != null) {
    const stepLabel = formatStepLabel(step);
    if (stepLabel) parts.push(stepLabel);
  }

  const fromStatus = payload.fromStatus;
  const toStatus = payload.toStatus;
  if (fromStatus != null && toStatus != null) {
    const fromLabel = formatOsStatus(fromStatus);
    const toLabel = formatOsStatus(toStatus);
    if (fromLabel && toLabel) parts.push(`${fromLabel} → ${toLabel}`);
  } else if (toStatus != null) {
    const toLabel = formatOsStatus(toStatus);
    if (toLabel) parts.push(toLabel);
  }

  if (payload.phase != null && typeof payload.phase === "string") {
    parts.push(formatOsStatus(payload.phase));
  }

  if (payload.lookup != null) {
    const lookupLabel = formatLookupLabel(payload.lookup);
    if (lookupLabel) parts.push(lookupLabel);
  }

  if (payload.fields != null) {
    const fieldsLabel = formatAdminFields(payload.fields);
    if (fieldsLabel) parts.push(fieldsLabel);
  }

  if (payload.number != null && typeof payload.number === "string") {
    parts.push(`OS ${payload.number}`);
  }

  if (typeof payload.cellCount === "number") {
    parts.push(`${payload.cellCount} células`);
  }

  if (typeof payload.itemsCount === "number") {
    parts.push(`${payload.itemsCount} item(ns)`);
  }

  if (typeof payload.photosCount === "number" && payload.photosCount > 0) {
    parts.push(`${payload.photosCount} foto(s)`);
  }

  const itemIdsSummary =
    formatIdArray(payload.selectedItemIds, "item", "itens") ||
    formatIdArray(payload.itemIds, "vão", "vãos") ||
    formatIdArray(payload.revertedItemIds, "vão", "vãos");
  if (itemIdsSummary) parts.push(itemIdsSummary);

  if (typeof payload.points === "number") {
    const active =
      payload.active === true
        ? "ativa"
        : payload.active === false
          ? "inativa"
          : null;
    parts.push(
      active
        ? `${payload.points} pts (${active})`
        : `${payload.points} pts`,
    );
  }

  if (payload.type != null && typeof payload.type === "string") {
    parts.push(payload.type);
  }

  if (payload.concluido === true) {
    parts.push("concluído");
  }

  return parts.join(" · ");
}
