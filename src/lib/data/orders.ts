import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { OrderDetail, OrderListItem } from "./types";
import type { OsStatus } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  canAccessOrder,
  filterOrdersForSession,
  type OrderAccessFields,
} from "@/lib/auth/order-access";
import { hasAnyRole } from "@/lib/auth/permissions";
import { getDriverIdsByOsIds } from "@/lib/logistics/transport-driver-access";
import { getInstallerIdsByOsIds } from "@/lib/installation/installation-installer-access";
import type { SessionUser } from "@/lib/auth/session-types";

async function enrichOrdersForAccess<
  T extends OrderAccessFields & { id: string },
>(orders: T[], session: SessionUser): Promise<T[]> {
  const needsDrivers = hasAnyRole(session.roles, ["motorista"]);
  const needsInstallers = hasAnyRole(session.roles, ["instalador"]);

  if (!needsDrivers && !needsInstallers) return orders;

  const [driverIdsByOs, installerIdsByOs] = await Promise.all([
    needsDrivers
      ? getDriverIdsByOsIds(orders.map((order) => order.id))
      : Promise.resolve({} as Record<string, string[]>),
    needsInstallers
      ? getInstallerIdsByOsIds(orders.map((order) => order.id))
      : Promise.resolve({} as Record<string, string[]>),
  ]);

  return orders.map((order) => ({
    ...order,
    ...(needsDrivers ? { driverIds: driverIdsByOs[order.id] ?? [] } : {}),
    ...(needsInstallers ? { installerIds: installerIdsByOs[order.id] ?? [] } : {}),
  }));
}

export async function listServiceOrders(): Promise<OrderListItem[]> {
  const session = await getSession();
  const orders = useMockData()
    ? mockRepository.list()
    : await (async () => {
        const { listServiceOrdersDb } = await import("./db-repository");
        return listServiceOrdersDb(session);
      })();

  const ordersForFilter =
    session &&
    (hasAnyRole(session.roles, ["motorista"]) ||
      hasAnyRole(session.roles, ["instalador"]))
      ? await enrichOrdersForAccess(orders, session)
      : orders;

  return filterOrdersForSession(ordersForFilter, session);
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

  const orderForAccess =
    hasAnyRole(session.roles, ["motorista"]) ||
    hasAnyRole(session.roles, ["instalador"])
      ? (await enrichOrdersForAccess([order], session))[0]
      : order;

  if (!canAccessOrder(session, orderForAccess)) return null;
  return order;
}

export async function listOrdersByStatus(
  status: OsStatus,
): Promise<OrderListItem[]> {
  const all = await listServiceOrders();
  return all.filter((o) => o.status === status);
}
