"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { measurements, serviceOrders } from "@/db/schema";
import { eqMeasurementType } from "@/lib/data/order-measurement-join";
import { measurementItemsSchema } from "@/lib/workflow/schemas";
import { notifyMedidorsOnMeasurementCreated } from "@/lib/notifications/notify-measurer";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { parseBrDate } from "@/lib/date-format";
import {
  parseExistingUrls,
  parsePhotoFiles,
  saveUploadedFiles,
} from "@/lib/upload/save-files";
import { persistMeasurementDrawings } from "@/lib/upload/save-base64-image";
import {
  parsePdfFileField,
  savePdfAndParseHeader,
} from "@/lib/upload/save-pdf";
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

export type ParsePdfPreviewResult =
  | {
      success: true;
      clientName: string | null;
      clientPhone: string | null;
      budgetReference: string | null;
      warning?: string;
    }
  | { success: false; message: string };

const createMeasurementSchema = z.object({
  clientName: z.string().min(2, "Nome do cliente obrigatório"),
  clientPhone: z.string().max(20).optional(),
  budgetReference: z.string().max(64).optional(),
  description: z.string().max(500).optional(),
  scheduledDate: z
    .string()
    .optional()
    .refine((value) => !value || parseBrDate(value) !== null, {
      message: "Data inválida. Use DD/MM/AAAA.",
    }),
  measurementType: z.enum(["orcamento", "final"]).default("final"),
});

async function resolvePhotoUrls(
  osId: string,
  formData: FormData,
): Promise<{ photos: string[]; error?: string }> {
  const existing = parseExistingUrls(formData);
  const files = parsePhotoFiles(formData);

  if (files.length === 0) {
    return { photos: existing };
  }

  const { urls, errors } = await saveUploadedFiles(files, "measurements", osId);
  if (urls.length === 0 && errors.length > 0) {
    return { photos: existing, error: errors.join("; ") };
  }

  return {
    photos: [...existing, ...urls],
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

async function createMeasurementShell(
  db: ReturnType<typeof getDb>,
  osId: string,
  type: "orcamento" | "final",
  header: {
    cliente: string;
    telefone: string | null;
    numeroOrcamento: string | null;
  },
) {
  await db.insert(measurements).values({
    osId,
    type,
    cliente: header.cliente,
    telefone: header.telefone,
    numeroOrcamento: header.numeroOrcamento,
    photos: [],
  });
}

/** Pré-visualiza dados extraídos do cabeçalho do PDF (sem criar OS). */
export async function parseMeasurementPdfPreview(
  formData: FormData,
): Promise<ParsePdfPreviewResult> {
  try {
    await requireRole(["admin", "gerente"]);
  } catch (err) {
    return {
      success: false,
      message: authErrorMessage(err) ?? "Sem permissão.",
    };
  }

  const pdfFile = parsePdfFileField(formData);
  if (!pdfFile) {
    return { success: false, message: "Selecione um arquivo PDF." };
  }

  try {
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const { parsePdfBuffer } = await import("@/lib/upload/save-pdf");
    const { header, error } = await parsePdfBuffer(buffer);
    return {
      success: true,
      clientName: header.clientName,
      clientPhone: header.clientPhone,
      budgetReference: header.budgetReference,
      warning: error,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao ler PDF",
    };
  }
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
    budgetReference: formData.get("budgetReference") || undefined,
    description: formData.get("description") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    measurementType: formData.get("measurementType") || "final",
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
    budgetReference,
    description,
    scheduledDate,
    measurementType,
  } = parsed.data;
  const osStatus = osStatusFromMeasurementType(measurementType);
  const scheduled = scheduledDate ? parseBrDate(scheduledDate) : null;

  if (useMockData()) {
    const result = mockRepository.createMeasurementFromPdf({
      clientName,
      clientPhone: clientPhone ?? null,
      budgetReference: budgetReference ?? null,
      description: description ?? null,
      scheduledDate: scheduled,
      assignedUserId: null,
      measurementType,
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
    redirect(`/field/${result.osId}`);
  }

  try {
    const db = getDb();
    const number = await generateServiceOrderNumber();

    const [created] = await db
      .insert(serviceOrders)
      .values({
        number,
        status: osStatus,
        measurementFlow: "profissional_mediu",
        assignedUserId: null,
        description: description ?? "Medição",
        scheduledDate: scheduled,
        budgetReference: budgetReference?.trim() || null,
      })
      .returning({ id: serviceOrders.id, number: serviceOrders.number });

    if (!created) {
      return { success: false, message: "Não foi possível criar a medição." };
    }

    let pdfHeader: { clientName: string | null; clientPhone: string | null; budgetReference: string | null } = {
      clientName: null,
      clientPhone: null,
      budgetReference: null,
    };

    if (pdfFile) {
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

    const finalCliente = clientName.trim() || pdfHeader.clientName?.trim() || clientName;
    const finalTelefone = clientPhone?.trim() || pdfHeader.clientPhone?.trim() || null;

    await db
      .update(serviceOrders)
      .set({
        budgetReference: finalBudgetRef,
        sourcePdfUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(serviceOrders.id, created.id));

    await createMeasurementShell(db, created.id, measurementType, {
      cliente: finalCliente,
      telefone: finalTelefone,
      numeroOrcamento: finalBudgetRef,
    });

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
    redirect(`/field/${created.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("[createMeasurementFromPdf]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao criar medição",
    };
  }

  return { success: false, message: "Não foi possível criar a medição." };
}

/**
 * Exclui medição por completo: arquivos no storage + OS e registros (cascade).
 * Apenas admin/gerente; somente OS em etapa medicao_*.
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

    const measRows = await db
      .select({
        photos: measurements.photos,
        items: measurements.items,
      })
      .from(measurements)
      .where(eq(measurements.osId, osId));

    const urls = collectMeasurementFileUrls({
      sourcePdfUrl: order.sourcePdfUrl,
      photos: measRows.flatMap((r) => r.photos ?? []),
      items: measRows.flatMap((r) => r.items ?? []),
    });

    await purgeAllOsFiles(osId, urls);

    await db.delete(serviceOrders).where(eq(serviceOrders.id, osId));

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath(`/dashboard/${osId}`);

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
  const items = itemsParsed.data;
  const { photos, error: photoError } = await resolvePhotoUrls(osId, formData);

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

  const orderContext = { status: order.status };

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
    itemsToSave = items.map((item) => ({
      ...item,
      drawingUrl:
        persisted.find((p) => p.id === item.id)?.drawingUrl ??
        item.drawingUrl ??
        null,
    }));
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Erro ao salvar desenhos",
    };
  }

  if (useMockData()) {
    const result = mockRepository.saveFieldMeasurement(osId, measurementType, {
      items: itemsToSave,
      notes: notes ?? null,
      photos,
    });
    if (!result.success) return result;
    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath(`/dashboard/${osId}`);
    const warn = photoError ? ` Aviso: ${photoError}` : "";
    return {
      success: true,
      message: `${typeLabel} registrada (modo demo) — ${items.length} item(ns).${photos.length ? ` ${photos.length} foto(s).` : ""}${warn}`,
    };
  }

  try {
    const db = getDb();

    const [existing] = await db
      .select({ id: measurements.id })
      .from(measurements)
      .where(
        and(eq(measurements.osId, osId), eqMeasurementType(measurementType)),
      )
      .limit(1);

    const values = {
      items: itemsToSave,
      notes: notes ?? null,
      photos,
      technicianId: session?.userId ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(measurements)
        .set(values)
        .where(eq(measurements.id, existing.id));
    } else {
      const [header] = await db
        .select({
          cliente: measurements.cliente,
          telefone: measurements.telefone,
          numeroOrcamento: measurements.numeroOrcamento,
        })
        .from(measurements)
        .where(eq(measurements.osId, osId))
        .limit(1);

      await db.insert(measurements).values({
        osId,
        type: measurementType,
        cliente: header?.cliente ?? null,
        telefone: header?.telefone ?? null,
        numeroOrcamento: header?.numeroOrcamento ?? null,
        ...values,
      });
    }

    await db
      .update(serviceOrders)
      .set({
        status: osStatusFromMeasurementType(measurementType),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrders.id, osId));

    revalidatePath("/field");
    revalidatePath(`/field/${osId}`);
    revalidatePath(`/dashboard/${osId}`);

    const warn = photoError ? ` (${photoError})` : "";
    return {
      success: true,
      message: `${typeLabel} registrada — ${items.length} item(ns).${photos.length ? ` ${photos.length} foto(s) anexada(s).` : ""}${warn}`,
    };
  } catch (error) {
    console.error("[saveFieldMeasurement]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao salvar medição",
    };
  }
}

