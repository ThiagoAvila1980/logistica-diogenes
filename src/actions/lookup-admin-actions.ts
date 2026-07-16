"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import {
  deleteTipoEnvidracamentoImage,
  parseCatalogImageFile,
  parseExistingCatalogImageUrl,
  saveTipoEnvidracamentoImage,
} from "@/lib/upload/catalog-image";
import { isPersistedUploadUrl } from "@/lib/upload/storage";
import { normalizePersistedUploadUrl } from "@/lib/upload/resolve-display-url";
import type { LookupAdminRow, AnyDb } from "@/lib/data/lookup-admin-db";
import type { AdminActionResult } from "@/actions/vehicle-actions";
import { getDb } from "@/db";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export type LookupEntity = "cores" | "tipo_vidro" | "tipo_envidracamento" | "ambientes";

const lookupSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, "Descrição obrigatória").max(255),
});

const tipoEnvidracamentoSchema = lookupSchema.extend({
  dificuldade: z.coerce.number().int().min(1, "Mínimo 1").max(99, "Máximo 99"),
});

const ENTITY_CONFIG: Record<
  LookupEntity,
  {
    adminPath: string;
    listDb: () => Promise<LookupAdminRow[]>;
    upsertDb: (data: {
      id?: string;
      descricao: string;
      imagemUrl?: string | null;
      dificuldade?: number;
    }, tx?: AnyDb) => Promise<string>;
    deleteDb: (id: string, tx?: AnyDb) => Promise<void>;
    countDupDb: (descricao: string, excludeId?: string) => Promise<number>;
  }
> = {
  cores: {
    adminPath: "/admin/cores",
    listDb: async () => {
      const { listCoresAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listCoresAdminDb();
    },
    upsertDb: async (data, tx) => {
      const { upsertCorDb } = await import("@/lib/data/lookup-admin-db");
      return upsertCorDb(data, tx);
    },
    deleteDb: async (id, tx) => {
      const { deleteCorDb } = await import("@/lib/data/lookup-admin-db");
      await deleteCorDb(id, tx);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countCorByDescricaoDb } = await import("@/lib/data/lookup-admin-db");
      return countCorByDescricaoDb(descricao, excludeId);
    },
  },
  tipo_vidro: {
    adminPath: "/admin/tipo-vidro",
    listDb: async () => {
      const { listTipoVidroAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listTipoVidroAdminDb();
    },
    upsertDb: async (data, tx) => {
      const { upsertTipoVidroDb } = await import("@/lib/data/lookup-admin-db");
      return upsertTipoVidroDb(data, tx);
    },
    deleteDb: async (id, tx) => {
      const { deleteTipoVidroDb } = await import("@/lib/data/lookup-admin-db");
      await deleteTipoVidroDb(id, tx);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countTipoVidroByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countTipoVidroByDescricaoDb(descricao, excludeId);
    },
  },
  tipo_envidracamento: {
    adminPath: "/admin/tipo-envidracamento",
    listDb: async () => {
      const { listTipoEnvidracamentoAdminDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return listTipoEnvidracamentoAdminDb();
    },
    upsertDb: async (data, tx) => {
      const { upsertTipoEnvidracamentoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return upsertTipoEnvidracamentoDb(data, tx);
    },
    deleteDb: async (id, tx) => {
      const { deleteTipoEnvidracamentoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      await deleteTipoEnvidracamentoDb(id, tx);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countTipoEnvidracamentoByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countTipoEnvidracamentoByDescricaoDb(descricao, excludeId);
    },
  },
  ambientes: {
    adminPath: "/admin/ambientes",
    listDb: async () => {
      const { listAmbientesAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listAmbientesAdminDb();
    },
    upsertDb: async (data, tx) => {
      const { upsertAmbienteDb } = await import("@/lib/data/lookup-admin-db");
      return upsertAmbienteDb(data, tx);
    },
    deleteDb: async (id, tx) => {
      const { deleteAmbienteDb } = await import("@/lib/data/lookup-admin-db");
      await deleteAmbienteDb(id, tx);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countAmbienteByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countAmbienteByDescricaoDb(descricao, excludeId);
    },
  },
};

function revalidateLookupPaths(adminPath: string) {
  revalidatePath(adminPath);
  revalidatePath("/field");
  revalidatePath("/dashboard");
  revalidatePath("/production");
  revalidatePath("/installation");
}

export async function getLookupItemsForAdmin(
  entity: LookupEntity,
): Promise<LookupAdminRow[]> {
  await requireRole(["admin"]);
  const config = ENTITY_CONFIG[entity];
  return config.listDb();
}

async function saveLookupInternal(
  entity: LookupEntity,
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const parsed = lookupSchema.safeParse({
    id: formData.get("id") || undefined,
    descricao: formData.get("descricao"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.descricao?.[0] ?? "Dados inválidos",
    };
  }

  const { id, descricao } = parsed.data;
  const config = ENTITY_CONFIG[entity];

  try {
    const dup = await config.countDupDb(descricao, id);
    if (dup > 0) {
      return { success: false, message: "Descrição já cadastrada" };
    }
    
    let savedId: string;
    const db = getDb();
    await db.transaction(async (tx) => {
      savedId = await config.upsertDb({ id, descricao }, tx);

      const normalizedEntity = entity === "cores" ? "cor" : entity === "ambientes" ? "ambiente" : entity;
      await recordAuditEvent(tx, {
        action: id ? AUDIT_ACTIONS.ADMIN_LOOKUP_UPDATED : AUDIT_ACTIONS.ADMIN_LOOKUP_CREATED,
        entityType: normalizedEntity,
        entityId: savedId,
        actorId: session.userId,
        payload: { lookup: normalizedEntity },
      });
    });

    revalidateLookupPaths(config.adminPath);
    return {
      success: true,
      message: id ? "Registro atualizado" : "Registro cadastrado",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao salvar registro",
    };
  }
}

export async function saveCor(
  prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  return saveLookupInternal("cores", prev, formData);
}

export async function saveTipoVidro(
  prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  return saveLookupInternal("tipo_vidro", prev, formData);
}

export async function saveTipoEnvidracamento(
  prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const parsed = tipoEnvidracamentoSchema.safeParse({
    id: formData.get("id") || undefined,
    descricao: formData.get("descricao"),
    dificuldade: formData.get("dificuldade") ?? 1,
  });

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.descricao?.[0] ??
        parsed.error.flatten().fieldErrors.dificuldade?.[0] ??
        "Dados inválidos",
    };
  }

  const { id, descricao, dificuldade } = parsed.data;
  const config = ENTITY_CONFIG.tipo_envidracamento;
  const removeImagem = formData.get("removeImagem") === "1";
  const newFile = parseCatalogImageFile(formData);
  const existingRaw = parseExistingCatalogImageUrl(formData);

  try {
    let imagemUrl: string | null = null;
    let previousImagemUrl: string | null = null;

    if (id) {
      const { getTipoEnvidracamentoImagemUrlDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      previousImagemUrl = await getTipoEnvidracamentoImagemUrlDb(id);
    }

    if (newFile) {
      imagemUrl = normalizePersistedUploadUrl(
        await saveTipoEnvidracamentoImage(newFile),
      );
    } else if (removeImagem) {
      imagemUrl = null;
    } else if (existingRaw && isPersistedUploadUrl(existingRaw)) {
      imagemUrl = normalizePersistedUploadUrl(existingRaw);
    } else if (id) {
      imagemUrl = previousImagemUrl;
    }

    const dup = await config.countDupDb(descricao, id);
    if (dup > 0) {
      if (newFile && imagemUrl) {
        await deleteTipoEnvidracamentoImage(imagemUrl);
      }
      return { success: false, message: "Descrição já cadastrada" };
    }

    let savedId: string;
    const db = getDb();
    await db.transaction(async (tx) => {
      savedId = await config.upsertDb({ id, descricao, imagemUrl, dificuldade }, tx);

      await recordAuditEvent(tx, {
        action: id ? AUDIT_ACTIONS.ADMIN_LOOKUP_UPDATED : AUDIT_ACTIONS.ADMIN_LOOKUP_CREATED,
        entityType: "tipo_envidracamento",
        entityId: savedId,
        actorId: session.userId,
        payload: { lookup: "tipo_envidracamento" },
      });
    });

    if (
      previousImagemUrl &&
      previousImagemUrl !== imagemUrl &&
      isPersistedUploadUrl(previousImagemUrl)
    ) {
      await deleteTipoEnvidracamentoImage(previousImagemUrl);
    }

    revalidateLookupPaths(config.adminPath);
    return {
      success: true,
      message: id ? "Registro atualizado" : "Registro cadastrado",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao salvar registro",
    };
  }
}

export async function deleteLookupItem(
  entity: LookupEntity,
  id: string,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const config = ENTITY_CONFIG[entity];

  try {
    const rows = await config.listDb();
    const row = rows.find((item) => item.id === id);
    if (row && row.usageCount > 0) {
      return {
        success: false,
        message: "Registro em uso em medições — não pode ser removido",
      };
    }

    let imagemUrl: string | null = null;
    if (entity === "tipo_envidracamento") {
      const { getTipoEnvidracamentoImagemUrlDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      imagemUrl = await getTipoEnvidracamentoImagemUrlDb(id);
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await config.deleteDb(id, tx);

      const normalizedEntity = entity === "cores" ? "cor" : entity === "ambientes" ? "ambiente" : entity;
      await recordAuditEvent(tx, {
        action: AUDIT_ACTIONS.ADMIN_LOOKUP_DELETED,
        entityType: normalizedEntity,
        entityId: id,
        actorId: session.userId,
        payload: { lookup: normalizedEntity },
      });
    });

    if (entity === "tipo_envidracamento" && imagemUrl && isPersistedUploadUrl(imagemUrl)) {
      await deleteTipoEnvidracamentoImage(imagemUrl);
    }

    revalidateLookupPaths(config.adminPath);
    return { success: true, message: "Registro removido" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao remover registro",
    };
  }
}

export async function deleteCor(id: string): Promise<AdminActionResult> {
  return deleteLookupItem("cores", id);
}

export async function deleteTipoVidroItem(
  id: string,
): Promise<AdminActionResult> {
  return deleteLookupItem("tipo_vidro", id);
}

export async function deleteTipoEnvidracamentoItem(
  id: string,
): Promise<AdminActionResult> {
  return deleteLookupItem("tipo_envidracamento", id);
}

export async function saveAmbiente(
  prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  return saveLookupInternal("ambientes", prev, formData);
}

export async function deleteAmbienteItem(
  id: string,
): Promise<AdminActionResult> {
  return deleteLookupItem("ambientes", id);
}
