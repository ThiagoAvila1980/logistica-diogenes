"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import { measurementItemsSchema } from "@/lib/workflow/schemas";
import { notifyMedidorsOnMeasurementCreated } from "@/lib/notifications/notify-measurer";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { parseBrDate } from "@/lib/date-format";
import { aggregateMeasurementPhotos } from "@/lib/measurement/item-photos";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import { persistMeasurementDrawings } from "@/lib/upload/save-base64-image";
import { parsePdfFileField } from "@/lib/upload/pdf-file-field";
import { getOrderDisplayNumber } from "@/lib/order-display";
import {
  collectMeasurementFileUrls,
  purgeAllOsFiles,
} from "@/lib/upload/purge-os-files";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { getSession } from "@/lib/auth/session";
import { generateServiceOrderNumber } from "@/actions/service-order";
import {
  FINAL_MEASUREMENT_TYPE,
  ORCAMENTO_MEASUREMENT_TYPE,
  getMeasurementActionErrorMessage,
  getMeasurementActionLabel,
  isMeasurementActionAllowed,
  osStatusFromMeasurementType,
} from "@/lib/workflow/measurement-actions";

const saveMeasurementSchema = z.object({
  osId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export type SaveFieldMeasurementResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type CreateMeasurementResult =
  | { success: true; osId: string; number: string }
  | { success: false; message: string };

export type DeleteMeasurementResult =
  | { success: true }
  | { success: false; message: string };

export type UpdateMeasurementHeaderResult =
  | { success: true }
  | { success: false; message: string };

const createMeasurementSchema = z.object({
  clientName: z.string().min(2, "Nome do cliente obrigatório"),
  clientPhone: z.string().max(20).optional(),
  clientAddress: z.string().max(500).optional(),
  budgetReference: z.string().max(64).optional(),
  description: z.string().max(500).optional(),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => !value || parseBrDate(value) !== null, {
      message: "Data inválida. Use DD/MM/AAAA.",
    }),
  measurementType: z.enum(["orcamento", "final"]).default("final"),
  priority: z.enum(["normal", "alta", "urgente"]).default("normal"),
});

const updateMeasurementHeaderSchema = z.object({
  osId: z.string().uuid(),
  clientName: z.string().min(2, "Nome do cliente obrigatório"),
  clientPhone: z.string().max(20).optional(),
  clientAddress: z.string().max(500).optional(),
  budgetReference: z.string().max(64).optional(),
});

function parsePriorityField(formData: FormData) {
  const parsed = z
    .object({
      priority: z.enum(["normal", "alta", "urgente"]).default("normal"),
    })
    .safeParse({
      priority: formData.get("priority") || "normal",
    });

  if (!parsed.success) {
    return { priority: "normal" as const };
  }

  return parsed.data;
}

/**
 * Admin cria medição anexando PDF de orçamento.
 * O sistema lê o cabeçalho e captura cliente, telefone e nº do orçamento.
 */
export async function createMeasurementFromPdf(
  formData: FormData,
): Promise<CreateMeasurementResult> {
  try {
    await requireRole(["admin", "gerente"]);
  } catch (err) {
    return {
      success: false,
      message: authErrorMessage(err) ?? "Sem permissão para criar medição.",
    };
  }

  const pdfFile = parsePdfFileField(formData);

  const parsed = createMeasurementSchema.safeParse({
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone") || undefined,
    clientAddress: formData.get("clientAddress") || undefined,
    budgetReference: formData.get("budgetReference") || undefined,
    description: formData.get("description") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    measurementType: formData.get("measurementType") || "final",
    priority: formData.get("priority") || "normal",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message:
        fieldErrors.clientName?.[0] ??
        fieldErrors.scheduledDate?.[0] ??
        "Dados inválidos.",
    };
  }

  const {
    clientName,
    clientPhone,
    clientAddress,
    budgetReference,
    description,
    scheduledDate,
    measurementType,
    priority,
  } = parsed.data;
  const etapa = osStatusFromMeasurementType(measurementType);
  const scheduled = scheduledDate ? parseBrDate(scheduledDate) : null;

  if (useMockData()) {
    const result = mockRepository.createMeasurementFromPdf({
      clientName,
      clientPhone: clientPhone ?? null,
      clientAddress: clientAddress ?? null,
      budgetReference: budgetReference ?? null,
      description: description ?? null,
      scheduledDate: scheduled,
      assignedUserId: null,
      measurementType,
      priority,
    });
    if (!result.success) return result;

    void notifyMedidorsOnMeasurementCreated({
      osId: result.osId,
      osNumber: getOrderDisplayNumber({
        number: result.number,
        budgetReference: budgetReference ?? null,
      }),
      clientName,
      clientPhone: clientPhone ?? null,
      budgetReference: budgetReference ?? null,
      description: description ?? null,
      scheduledDate: scheduled,
    }).catch((err) => console.error("[createMeasurementFromPdf:notify]", err));

    revalidatePath("/field");
    return {
      success: true,
      osId: result.osId,
      number: result.number,
    };
  }

  try {
    const db = getDb();
    const number = await generateServiceOrderNumber();

    let pdfHeader: {
      clientName: string | null;
      clientPhone: string | null;
      clientAddress: string | null;
      budgetReference: string | null;
    } = {
      clientName: null,
      clientPhone: null,
      clientAddress: null,
      budgetReference: null,
    };

    const finalBudgetRefInitial = budgetReference?.trim() || null;
    const finalClienteInitial = clientName.trim();
    const finalTelefoneInitial = clientPhone?.trim() || null;
    const finalEnderecoInitial = clientAddress?.trim() || null;

    const [created] = await db
      .insert(measurements)
      .values({
        number,
        type: measurementType,
        status: "pendente",
        etapa,
        priority,
        assignedUserId: null,
        description: description ?? "Medição",
        scheduledDate: scheduled,
        budgetReference: finalBudgetRefInitial,
        cliente: finalClienteInitial,
        telefone: finalTelefoneInitial,
        endereco: finalEnderecoInitial,
        numeroOrcamento: finalBudgetRefInitial,
        photos: [],
      })
      .returning({ id: measurements.id, number: measurements.number });

    if (!created) {
      return { success: false, message: "Não foi possível criar a medição." };
    }

    if (pdfFile) {
      const { savePdfAndParseHeader } = await import("@/lib/upload/save-pdf");
      const { header, error: parseWarning } = await savePdfAndParseHeader(
        pdfFile,
        created.id,
        { keepLocalCopy: false },
      );
      pdfHeader = header;
      if (parseWarning) {
        console.warn("[createMeasurementFromPdf]", parseWarning);
      }
    }

    const finalBudgetRef =
      budgetReference?.trim() ||
      pdfHeader.budgetReference?.trim() ||
      null;

    const finalCliente =
      clientName.trim() || pdfHeader.clientName?.trim() || clientName;
    const finalTelefone =
      clientPhone?.trim() || pdfHeader.clientPhone?.trim() || null;
    const finalEndereco =
      clientAddress?.trim() || pdfHeader.clientAddress?.trim() || null;

    await db
      .update(measurements)
      .set({
        budgetReference: finalBudgetRef,
        numeroOrcamento: finalBudgetRef,
        cliente: finalCliente,
        telefone: finalTelefone,
        endereco: finalEndereco,
        sourcePdfUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(measurements.id, created.id));

    void notifyMedidorsOnMeasurementCreated({
      osId: created.id,
      osNumber: getOrderDisplayNumber({
        number: created.number,
        budgetReference: finalBudgetRef,
      }),
      clientName: finalCliente,
      clientPhone: finalTelefone,
      budgetReference: finalBudgetRef,
      description: description ?? null,
      scheduledDate: scheduled,
    }).catch((err) =>
      console.error("[createMeasurementFromPdf:notify]", err),
    );

    revalidatePath("/field");
    return {
      success: true,
      osId: created.id,
      number: created.number,
    };
  } catch (error) {
    console.error("[createMeasurementFromPdf]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao criar medição",
    };
  }
}

/**
 * Admin/gerente atualiza cabeçalho da medição (cliente, telefone, endereço, nº orçamento).
 */
export async function updateMeasurementHeader(
  formData: FormData,
): Promise<UpdateMeasurementHeaderResult> {
  try {
    await requireRole(["admin", "gerente"]);
  } catch (err) {
    return {
      success: false,
      message:
        authErrorMessage(err) ?? "Sem permissão para editar dados da medição.",
    };
  }

  const parsed = updateMeasurementHeaderSchema.safeParse({
    osId: formData.get("osId"),
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone") || undefined,
    clientAddress: formData.get("clientAddress") || undefined,
    budgetReference: formData.get("budgetReference") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message:
        fieldErrors.clientName?.[0] ??
        fieldErrors.osId?.[0] ??
        "Dados inválidos.",
    };
  }

  const { osId, clientName, clientPhone, clientAddress, budgetReference } =
    parsed.data;

  const { getServiceOrderById } = await import("@/lib/data/orders");
  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "Medição não encontrada." };
  }

  if (!order.status.startsWith("medicao")) {
    return {
      success: false,
      message: "Só é possível editar medições em etapa de medição.",
    };
  }

  const budgetRef = budgetReference?.trim() || null;

  if (useMockData()) {
    const result = mockRepository.updateMeasurementHeader(osId, {
      clientName: clientName.trim(),
      clientPhone: clientPhone?.trim() || null,
      clientAddress: clientAddress?.trim() || null,
      budgetReference: budgetRef,
    });
    if (!result.success) return result;

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    return { success: true };
  }

  try {
    const db = getDb();
    await db
      .update(measurements)
      .set({
        cliente: clientName.trim(),
        telefone: clientPhone?.trim() || null,
        endereco: clientAddress?.trim() || null,
        budgetReference: budgetRef,
        numeroOrcamento: budgetRef,
        updatedAt: new Date(),
      })
      .where(eq(measurements.id, osId));

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateMeasurementHeader]", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao salvar dados da medição",
    };
  }
}

/**
 * Exclui medição por completo: arquivos no storage + registro (cascade).
 * Apenas admin/gerente; somente medições em etapa medicao_*.
 */
export async function deleteMeasurement(
  osId: string,
): Promise<DeleteMeasurementResult> {
  try {
    await requireRole(["admin", "gerente"]);
  } catch (err) {
    return {
      success: false,
      message: authErrorMessage(err) ?? "Sem permissão para excluir medição.",
    };
  }

  if (!osId || !z.string().uuid().safeParse(osId).success) {
    return { success: false, message: "ID inválido." };
  }

  const { getServiceOrderById } = await import("@/lib/data/orders");
  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "Medição não encontrada." };
  }

  if (!order.status.startsWith("medicao")) {
    return {
      success: false,
      message:
        "Só é possível excluir medições ainda em etapa de medição (antes do orçamento enviado).",
    };
  }

  if (useMockData()) {
    const result = mockRepository.deleteMeasurementOs(osId);
    if (!result.success) return result;
    revalidatePath("/field");
    return { success: true };
  }

  try {
    const db = getDb();

    const [measRow] = await db
      .select({
        photos: measurements.photos,
        items: measurements.items,
      })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1);

    const urls = collectMeasurementFileUrls({
      sourcePdfUrl: order.sourcePdfUrl,
      photos: measRow?.photos ?? [],
      items: measRow?.items ?? [],
    });

    await purgeAllOsFiles(osId, urls);

    await db.delete(measurements).where(eq(measurements.id, osId));

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[deleteMeasurement]", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao excluir medição",
    };
  }
}

export async function saveFieldMeasurement(
  formData: FormData,
): Promise<SaveFieldMeasurementResult> {
  try {
    await requireRole(["admin", "gerente", "medidor"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão para registrar medição." };
  }

  const rawItems = formData.get("items");
  let itemsJson: unknown;
  try {
    itemsJson = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
  } catch {
    return { success: false, message: "Formato de medições inválido." };
  }

  const itemsParsed = measurementItemsSchema.safeParse(itemsJson);
  if (!itemsParsed.success) {
    return {
      success: false,
      message:
        itemsParsed.error.flatten().formErrors[0] ??
        "Informe ao menos uma medição com quantidade, largura e altura.",
    };
  }

  const parsed = saveMeasurementSchema.safeParse({
    osId: formData.get("osId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const rawType = formData.get("measurementType");
  const measurementType =
    rawType === ORCAMENTO_MEASUREMENT_TYPE
      ? ORCAMENTO_MEASUREMENT_TYPE
      : FINAL_MEASUREMENT_TYPE;
  const { osId, notes } = parsed.data;
  const items = sortMeasurementItemsOldestFirst(itemsParsed.data);
  const priorityField = parsePriorityField(formData);

  const { getServiceOrderById } = await import("@/lib/data/orders");
  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "OS não encontrada." };
  }

  if (!order.status.startsWith("medicao")) {
    return {
      success: false,
      message: "Esta OS não está em etapa de medição.",
    };
  }

  const orderContext = { etapa: order.status };

  if (!isMeasurementActionAllowed(orderContext, measurementType)) {
    return {
      success: false,
      message: getMeasurementActionErrorMessage(measurementType),
    };
  }

  const typeLabel = getMeasurementActionLabel(measurementType);
  const session = await getSession();

  let itemsToSave = items;
  try {
    const persisted = await persistMeasurementDrawings(osId, items);
    itemsToSave = items.map((item) => {
      const p = persisted.find((p) => p.id === item.id);
      return {
        ...item,
        drawingUrl: p?.drawingUrl ?? item.drawingUrl ?? null,
        drawings:
          p?.drawings !== undefined ? p.drawings : (item.drawings ?? undefined),
      };
    });
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Erro ao salvar desenhos",
    };
  }

  const photos = aggregateMeasurementPhotos(itemsToSave);

  if (useMockData()) {
    const result = mockRepository.saveFieldMeasurement(osId, measurementType, {
      items: itemsToSave,
      notes: notes ?? null,
      photos,
      priority: priorityField.priority,
    });
    if (!result.success) return result;
    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `${typeLabel} registrada (modo demo) — ${items.length} item(ns).${photos.length ? ` ${photos.length} foto(s).` : ""}`,
    };
  }

  try {
    const db = getDb();

    await db
      .update(measurements)
      .set({
        type: measurementType,
        items: itemsToSave,
        notes: notes ?? null,
        photos,
        status: "medida",
        etapa: osStatusFromMeasurementType(measurementType),
        priority: priorityField.priority,
        updatedAt: new Date(),
      })
      .where(eq(measurements.id, osId));

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `${typeLabel} registrada — ${items.length} item(ns).${photos.length ? ` ${photos.length} foto(s) anexada(s).` : ""}`,
    };
  } catch (error) {
    console.error("[saveFieldMeasurement]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao salvar medição",
    };
  }
}
