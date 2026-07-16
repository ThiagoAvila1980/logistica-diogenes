export type PedidoStatus = "sem_pedido" | "pedido_feito" | "pedido_entregue";

export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  sem_pedido: "Sem Pedido",
  pedido_feito: "Pedido Feito",
  pedido_entregue: "Pedido Entregue",
};

export const PEDIDO_STATUS_STYLE: Record<PedidoStatus, string> = {
  sem_pedido: "bg-destructive/10 text-destructive",
  pedido_feito: "bg-brass-subtle text-brass-foreground",
  pedido_entregue: "bg-success-subtle text-success-foreground",
};

export function derivePedidoStatus(
  p: { pedidoFeito: boolean; pedidoRecebido: boolean } | null | undefined,
): PedidoStatus {
  if (!p?.pedidoFeito) return "sem_pedido";
  return p.pedidoRecebido ? "pedido_entregue" : "pedido_feito";
}
