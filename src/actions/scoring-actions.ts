"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { scoringRules } from "@/db/schema";
import type { WorkEventType, ScoringRule } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import type { ScoringActionResult } from "@/lib/performance/scoring-actions-types";

// ─── Action: ler regras ───────────────────────────────────────────────────────

export async function getScoringRules(): Promise<ScoringRule[]> {
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
