import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { OrderDetail, OrderListItem } from "./types";
import type { OsStatus } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  canAccessOrder,
  filterOrdersForSession,
} from "@/lib/auth/order-access";

export async function listServiceOrders(): Promise<OrderListItem[]> {
  const session = await getSession();
  const orders = useMockData()
    ? mockRepository.list()
    : await (async () => {
        const { listServiceOrdersDb } = await import("./db-repository");
        return listServiceOrdersDb(session);
      })();
  return filterOrdersForSession(orders, session);
}

export async function getServiceOrderById(
  id: string,
): Promise<OrderDetail | null> {
  const session = await getSession();
  const order = useMockData()
    ? mockRepository.getById(id)
    : await (async () => {
        const { getServiceOrderByIdDb } = await import("./db-repository");
        return getServiceOrderByIdDb(id);
      })();

  if (!order || !session) return null;
  if (!canAccessOrder(session, order)) return null;
  return order;
}

export async function listOrdersByStatus(
  status: OsStatus,
): Promise<OrderListItem[]> {
  const all = await listServiceOrders();
  return all.filter((o) => o.status === status);
}
