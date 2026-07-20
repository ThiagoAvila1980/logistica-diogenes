import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canAccessOrder } from "@/lib/auth/order-access";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import { buildVaoLabelRaw } from "@/lib/labels/build-vao-label";
import { DEFAULT_LABEL_PROFILE } from "@/lib/labels/label-profile";
import { renderLabelPreviewDataUrl } from "@/lib/labels/render-label-preview";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ osId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { osId } = await params;
  const search = new URL(request.url).searchParams;
  const itemId = search.get("itemId")?.trim();
  const wantPreview = search.get("preview") === "1";
  if (!itemId) {
    return NextResponse.json(
      { error: "Parâmetro itemId é obrigatório" },
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
  const { raw, content, profile } = buildVaoLabelRaw({
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

  let previewDataUrl: string | null = null;
  if (wantPreview) {
    try {
      previewDataUrl = await renderLabelPreviewDataUrl(content, profile);
    } catch (err) {
      console.error("[api/labels] falha ao gerar preview", err);
    }
  }

  return NextResponse.json({
    raw,
    content,
    previewDataUrl,
    profile: {
      id: profile.id,
      widthMm: profile.widthMm,
      heightMm: profile.heightMm,
      dpi: profile.dpi,
      language: profile.language,
    },
    qrPayload: content.qrPayload,
  });
}
