"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { scoringRules } from "@/db/schema";
import type { WorkEventType, ScoringRule } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { useMockData } from "@/lib/data/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoringActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export const EVENT_TYPE_LABELS: Record<WorkEventType, string> = {
  corte_vao: "Corte de vão",
  transporte_vao: "Transporte de vão",
  instalacao_vao: "Instalação de vão",
  medicao: "Medição",
};

// ─── Action: ler regras ───────────────────────────────────────────────────────

export async function getScoringRules(): Promise<ScoringRule[]> {
  if (useMockData()) {
    return [
      { eventType: "corte_vao", points: 10, active: true, updatedAt: new Date() },
      { eventType: "transporte_vao", points: 15, active: true, updatedAt: new Date() },
      { eventType: "instalacao_vao", points: 20, active: true, updatedAt: new Date() },
      { eventType: "medicao", points: 10, active: true, updatedAt: new Date() },
    ];
  }

  const db = getDb();
  return db.select().from(scoringRules);
}

// ─── Action: atualizar regra ──────────────────────────────────────────────────

const updateScoringRuleSchema = z.object({
  eventType: z.enum(["corte_vao", "transporte_vao", "instalacao_vao", "medicao"]),
  points: z.coerce.number().int().min(0).max(9999),
  active: z.coerce.boolean(),
});

export async function updateScoringRuleAction(
  _prev: ScoringActionResult | null,
  formData: FormData,
): Promise<ScoringActionResult> {
  try {
    await requireRole(["admin"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const parsed = updateScoringRuleSchema.safeParse({
    eventType: formData.get("eventType"),
    points: formData.get("points"),
    active: formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { success: false, message: "Dados inválidos. Verifique os campos." };
  }

  if (useMockData()) {
    return { success: true, message: "Regra atualizada (modo demo)." };
  }

  try {
    const db = getDb();
    await db
      .update(scoringRules)
      .set({
        points: parsed.data.points,
        active: parsed.data.active,
        updatedAt: new Date(),
      })
      .where(eq(scoringRules.eventType, parsed.data.eventType as WorkEventType));

    revalidatePath("/admin/scoring");
    return { success: true, message: "Pontuação atualizada com sucesso." };
  } catch (err) {
    console.error("[updateScoringRuleAction]", err);
    return { success: false, message: "Erro ao atualizar pontuação." };
  }
}
