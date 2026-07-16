import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pedidos, users } from "@/db/schema";

export type PedidoDetail = {
  osId: string;
  pedidoFeito: boolean;
  pedidoFeitoAt: Date | null;
  pedidoFeitoPor: { id: string; name: string } | null;
  pedidoRecebido: boolean;
  pedidoRecebidoAt: Date | null;
  pedidoRecebidoPor: { id: string; name: string } | null;
};

const feitoPor = {
  id: users.id,
  name: users.name,
};

export async function getPedidoByMeasurementId(
  osId: string,
): Promise<PedidoDetail> {
  const db = getDb();

  const [row] = await db
    .select({
      pedidoFeito: pedidos.pedidoFeito,
      pedidoFeitoAt: pedidos.pedidoFeitoAt,
      pedidoFeitoPorId: pedidos.pedidoFeitoPorId,
      pedidoRecebido: pedidos.pedidoRecebido,
      pedidoRecebidoAt: pedidos.pedidoRecebidoAt,
      pedidoRecebidoPorId: pedidos.pedidoRecebidoPorId,
    })
    .from(pedidos)
    .where(eq(pedidos.idMedicao, osId))
    .limit(1);

  if (!row) {
    return {
      osId,
      pedidoFeito: false,
      pedidoFeitoAt: null,
      pedidoFeitoPor: null,
      pedidoRecebido: false,
      pedidoRecebidoAt: null,
      pedidoRecebidoPor: null,
    };
  }

  const [feitoUser, recebidoUser] = await Promise.all([
    row.pedidoFeitoPorId
      ? db
          .select(feitoPor)
          .from(users)
          .where(eq(users.id, row.pedidoFeitoPorId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    row.pedidoRecebidoPorId
      ? db
          .select(feitoPor)
          .from(users)
          .where(eq(users.id, row.pedidoRecebidoPorId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    osId,
    pedidoFeito: row.pedidoFeito,
    pedidoFeitoAt: row.pedidoFeitoAt,
    pedidoFeitoPor: feitoUser,
    pedidoRecebido: row.pedidoRecebido,
    pedidoRecebidoAt: row.pedidoRecebidoAt,
    pedidoRecebidoPor: recebidoUser,
  };
}
