import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { scoringRules, workEvents, users } from "@/db/schema";
import type { WorkEventType } from "@/db/schema";
import type { getDb } from "@/db";
import { getVaoDificuldadeMultiplier } from "@/lib/performance/vao-difficulty";

/**
 * Tipo compatível com o db Drizzle e com objetos de transação.
 * Ambos expõem a mesma interface de query builder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Pick<ReturnType<typeof getDb>, "insert" | "select" | "delete">;

/**
 * Retorna os pontos configurados para um tipo de evento.
 * Retorna 0 se a regra não existir ou estiver inativa.
 */
export async function getRulePoints(db: AnyDb, eventType: WorkEventType): Promise<number> {
  const [rule] = await db
    .select({ points: scoringRules.points, active: scoringRules.active })
    .from(scoringRules)
    .where(eq(scoringRules.eventType, eventType))
    .limit(1);

  if (!rule?.active) return 0;
  return rule.points;
}

/**
 * Busca o único usuário ativo com role 'cortador'.
 * Retorna null se não existir cortador ativo cadastrado.
 */
export async function findActiveCortador(db: AnyDb): Promise<string | null> {
  const [cutter] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.active, true),
        sql`'cortador' = ANY(${users.roles})`,
      ),
    )
    .limit(1);

  return cutter?.id ?? null;
}

/**
 * Registra um evento de trabalho pontuado.
 * Idempotente: ignora silenciosamente se já existir registro para
 * (measurement_id, item_id, event_type).
 */
export async function recordWorkEvent(
  db: AnyDb,
  params: {
    userId: string;
    measurementId: string;
    itemId: string;
    eventType: WorkEventType;
    /** Multiplicador opcional (ex.: dificuldade do tipo de envidraçamento). */
    pointsMultiplier?: number;
  },
): Promise<void> {
  const basePoints = await getRulePoints(db, params.eventType);
  if (basePoints === 0) return;

  const multiplier = params.pointsMultiplier ?? 1;
  const points = Math.round(basePoints * multiplier);
  if (points === 0) return;

  await db
    .insert(workEvents)
    .values({
      userId: params.userId,
      measurementId: params.measurementId,
      itemId: params.itemId,
      eventType: params.eventType,
      points,
    })
    .onConflictDoNothing();
}

/**
 * Remove o evento de trabalho para (measurement_id, item_id, event_type).
 * Usado quando uma etapa é desmarcada (undo).
 */
export async function reverseWorkEvent(
  db: AnyDb,
  params: {
    measurementId: string;
    itemId: string;
    eventType: WorkEventType;
  },
): Promise<void> {
  await db
    .delete(workEvents)
    .where(
      and(
        eq(workEvents.measurementId, params.measurementId),
        eq(workEvents.itemId, params.itemId),
        eq(workEvents.eventType, params.eventType),
      ),
    );
}

/**
 * Pontua (ou reverte) a conclusão do último passo de um vão numa etapa
 * (corte/transporte/instalação), aplicando o multiplicador de dificuldade
 * do tipo de envidraçamento. `userId` já deve vir resolvido pelo chamador
 * (cada etapa tem sua própria forma de identificar o responsável).
 */
export async function recordVaoStepCompletion(
  db: AnyDb,
  params: {
    userId: string | null | undefined;
    measurementId: string;
    itemId: string;
    eventType: WorkEventType;
    idTipoEnvidracamento: string | null | undefined;
    done: boolean;
  },
): Promise<void> {
  const { userId, measurementId, itemId, eventType, idTipoEnvidracamento, done } = params;

  if (!done) {
    await reverseWorkEvent(db, { measurementId, itemId, eventType });
    return;
  }

  if (!userId) return;

  const pointsMultiplier = await getVaoDificuldadeMultiplier(db, idTipoEnvidracamento);
  await recordWorkEvent(db, {
    userId,
    measurementId,
    itemId,
    eventType,
    pointsMultiplier,
  });
}
