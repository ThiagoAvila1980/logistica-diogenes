import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canAccessOrder } from "@/lib/auth/order-access";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import { buildVaoLabelRaw } from "@/lib/labels/build-vao-label";
import { DEFAULT_LABEL_PROFILE } from "@/lib/labels/label-profile";
import { createLabelPrintJob } from "@/lib/labels/print-jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { osId?: string; itemId?: string };
  try {
    body = (await request.json()) as { osId?: string; itemId?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const osId = body.osId?.trim();
  const itemId = body.itemId?.trim();
  if (!osId || !itemId) {
    return NextResponse.json(
      { error: "osId e itemId são obrigatórios" },
      { status: 400 },
    );
  }

  const order = await getServiceOrderById(osId);
  if (!order) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  if (
    !canAccessOrder(session, {
      status: order.status,
      assignedUserId: order.assignedUserId,
    })
  ) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [draft, lookups] = await Promise.all([
    getFieldMeasurementDraft(osId, order, order.type),
    listMeasurementLookups(),
  ]);

  const orderedItems = sortMeasurementItemsOldestFirst(draft?.items ?? []);
  const itemIndex = orderedItems.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) {
    return NextResponse.json({ error: "Vão não encontrado" }, { status: 404 });
  }

  const item = orderedItems[itemIndex];
  const { raw } = buildVaoLabelRaw({
    order: {
      number: order.number,
      budgetReference: order.budgetReference,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      clientAddress: order.clientAddress,
      numeroOrcamento: draft?.numeroOrcamento ?? null,
    },
    item,
    itemIndex,
    lookups,
    profile: DEFAULT_LABEL_PROFILE,
  });

  const job = await createLabelPrintJob({
    measurementId: osId,
    itemId,
    raw,
    createdById: session.userId,
  });

  return NextResponse.json({ ok: true, job });
}
