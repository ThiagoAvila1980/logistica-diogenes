"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { useMockData } from "@/lib/data/config";
import {
  corMockStore,
  tipoEnvidracamentoAdminMockStore,
  tipoVidroMockStore,
  ambienteMockStore,
} from "@/lib/data/admin-mock-store";
import {
  deleteTipoEnvidracamentoImage,
  parseCatalogImageFile,
  parseExistingCatalogImageUrl,
  saveTipoEnvidracamentoImage,
} from "@/lib/upload/catalog-image";
import { isPersistedUploadUrl } from "@/lib/upload/storage";
import { normalizePersistedUploadUrl } from "@/lib/upload/resolve-display-url";
import type { LookupAdminRow } from "@/lib/data/lookup-admin-db";
import type { AdminActionResult } from "@/actions/vehicle-actions";

export type LookupEntity = "cores" | "tipo_vidro" | "tipo_envidracamento" | "ambientes";

const lookupSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, "Descrição obrigatória").max(255),
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
    }) => Promise<void>;
    deleteDb: (id: string) => Promise<void>;
    countDupDb: (descricao: string, excludeId?: string) => Promise<number>;
    mockStore: {
      list: () => { id: string; descricao: string }[];
      create: (descricao: string) => { id: string; descricao: string };
      update: (id: string, descricao: string) => { id: string; descricao: string };
      delete: (id: string) => void;
    };
  }
> = {
  cores: {
    adminPath: "/admin/cores",
    listDb: async () => {
      const { listCoresAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listCoresAdminDb();
    },
    upsertDb: async (data) => {
      const { upsertCorDb } = await import("@/lib/data/lookup-admin-db");
      await upsertCorDb(data);
    },
    deleteDb: async (id) => {
      const { deleteCorDb } = await import("@/lib/data/lookup-admin-db");
      await deleteCorDb(id);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countCorByDescricaoDb } = await import("@/lib/data/lookup-admin-db");
      return countCorByDescricaoDb(descricao, excludeId);
    },
    mockStore: corMockStore,
  },
  tipo_vidro: {
    adminPath: "/admin/tipo-vidro",
    listDb: async () => {
      const { listTipoVidroAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listTipoVidroAdminDb();
    },
    upsertDb: async (data) => {
      const { upsertTipoVidroDb } = await import("@/lib/data/lookup-admin-db");
      await upsertTipoVidroDb(data);
    },
    deleteDb: async (id) => {
      const { deleteTipoVidroDb } = await import("@/lib/data/lookup-admin-db");
      await deleteTipoVidroDb(id);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countTipoVidroByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countTipoVidroByDescricaoDb(descricao, excludeId);
    },
    mockStore: tipoVidroMockStore,
  },
  tipo_envidracamento: {
    adminPath: "/admin/tipo-envidracamento",
    listDb: async () => {
      const { listTipoEnvidracamentoAdminDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return listTipoEnvidracamentoAdminDb();
    },
    upsertDb: async (data) => {
      const { upsertTipoEnvidracamentoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      await upsertTipoEnvidracamentoDb(data);
    },
    deleteDb: async (id) => {
      const { deleteTipoEnvidracamentoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      await deleteTipoEnvidracamentoDb(id);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countTipoEnvidracamentoByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countTipoEnvidracamentoByDescricaoDb(descricao, excludeId);
    },
    mockStore: {
      list: () =>
        tipoEnvidracamentoAdminMockStore.list().map(({ id, descricao, imagemUrl }) => ({
          id,
          descricao,
          imagemUrl,
        })),
      create: (descricao: string) =>
        tipoEnvidracamentoAdminMockStore.create(descricao, null),
      update: (id: string, descricao: string) =>
        tipoEnvidracamentoAdminMockStore.update(
          id,
          descricao,
          tipoEnvidracamentoAdminMockStore.getImagemUrl(id),
        ),
      delete: (id: string) => tipoEnvidracamentoAdminMockStore.delete(id),
    },
  },
  ambientes: {
    adminPath: "/admin/ambientes",
    listDb: async () => {
      const { listAmbientesAdminDb } = await import("@/lib/data/lookup-admin-db");
      return listAmbientesAdminDb();
    },
    upsertDb: async (data) => {
      const { upsertAmbienteDb } = await import("@/lib/data/lookup-admin-db");
      await upsertAmbienteDb(data);
    },
    deleteDb: async (id) => {
      const { deleteAmbienteDb } = await import("@/lib/data/lookup-admin-db");
      await deleteAmbienteDb(id);
    },
    countDupDb: async (descricao, excludeId) => {
      const { countAmbienteByDescricaoDb } = await import(
        "@/lib/data/lookup-admin-db"
      );
      return countAmbienteByDescricaoDb(descricao, excludeId);
    },
    mockStore: ambienteMockStore,
  },
};

function revalidateLookupPaths(adminPath: string) {
  revalidatePath(adminPath);
  revalidatePath("/field");
  revalidatePath("/dashboard");
  revalidatePath("/production");
  revalidatePath("/installation");
}

function toAdminRows(
  items: { id: string; descricao: string }[],
): LookupAdminRow[] {
  return items.map((item) => ({
    ...item,
    usageCount: 0,
  }));
}

export async function getLookupItemsForAdmin(
  entity: LookupEntity,
): Promise<LookupAdminRow[]> {
  await requireRole(["admin"]);
  const config = ENTITY_CONFIG[entity];
  if (useMockData()) {
    return toAdminRows(config.mockStore.list());
  }
  return config.listDb();
}

async function saveLookupInternal(
  entity: LookupEntity,
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    await requireRole(["admin"]);
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
    if (useMockData()) {
      if (id) {
        config.mockStore.update(id, descricao);
      } else {
        config.mockStore.create(descricao);
      }
    } else {
      const dup = await config.countDupDb(descricao, id);
      if (dup > 0) {
        return { success: false, message: "Descrição já cadastrada" };
      }
      await config.upsertDb({ id, descricao });
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
  try {
    await requireRole(["admin"]);
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
  const config = ENTITY_CONFIG.tipo_envidracamento;
  const removeImagem = formData.get("removeImagem") === "1";
  const newFile = parseCatalogImageFile(formData);
  const existingRaw = parseExistingCatalogImageUrl(formData);

  try {
    let imagemUrl: string | null = null;
    let previousImagemUrl: string | null = null;

    if (useMockData()) {
      if (id) {
        previousImagemUrl = tipoEnvidracamentoAdminMockStore.getImagemUrl(id);
      }
      if (newFile) {
        imagemUrl = `mock://tipo-envidracamento/${newFile.name}`;
      } else if (removeImagem) {
        imagemUrl = null;
      } else if (existingRaw) {
        imagemUrl = existingRaw;
      } else if (id) {
        imagemUrl = previousImagemUrl;
      }

      if (id) {
        tipoEnvidracamentoAdminMockStore.update(id, descricao, imagemUrl);
      } else {
        tipoEnvidracamentoAdminMockStore.create(descricao, imagemUrl);
      }
    } else {
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

      await config.upsertDb({ id, descricao, imagemUrl });

      if (
        previousImagemUrl &&
        previousImagemUrl !== imagemUrl &&
        isPersistedUploadUrl(previousImagemUrl)
      ) {
        await deleteTipoEnvidracamentoImage(previousImagemUrl);
      }
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
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const config = ENTITY_CONFIG[entity];

  try {
    if (useMockData()) {
      config.mockStore.delete(id);
    } else {
      const rows = await config.listDb();
      const row = rows.find((item) => item.id === id);
      if (row && row.usageCount > 0) {
        return {
          success: false,
          message: "Registro em uso em medições — não pode ser removido",
        };
      }
      if (entity === "tipo_envidracamento") {
        const { getTipoEnvidracamentoImagemUrlDb } = await import(
          "@/lib/data/lookup-admin-db"
        );
        const imagemUrl = await getTipoEnvidracamentoImagemUrlDb(id);
        await config.deleteDb(id);
        if (imagemUrl && isPersistedUploadUrl(imagemUrl)) {
          await deleteTipoEnvidracamentoImage(imagemUrl);
        }
      } else {
        await config.deleteDb(id);
      }
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
