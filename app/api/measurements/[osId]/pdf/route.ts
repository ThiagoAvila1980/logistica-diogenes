import { NextResponse } from "next/server";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import type { FieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { generateMeasurementPdf } from "@/lib/pdf/measurement-pdf";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getVaoNumber } from "@/lib/measurement/vao-item-subtitle";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ osId: string }>;
};

function filterDraftByItemIds(
  draft: FieldMeasurementDraft | undefined,
  itemIdsParam: string,
): FieldMeasurementDraft | undefined {
  if (!draft) return draft;
  const requestedIds = new Set(
    itemIdsParam.split(",").map((id) => id.trim()).filter(Boolean),
  );
  if (requestedIds.size === 0) return draft;
  return {
    ...draft,
    items: (draft.items ?? []).filter((item) => requestedIds.has(item.id)),
  };
}

function buildVaoSuffix(
  draft: FieldMeasurementDraft | undefined,
  filteredDraft: FieldMeasurementDraft | undefined,
): string {
  const orderedItems = sortMeasurementItemsOldestFirst(draft?.items ?? []);
  const filteredItems = filteredDraft?.items ?? [];
  if (filteredItems.length !== 1) {
    return `-vaos_${filteredItems.length}`;
  }
  const index = orderedItems.findIndex((item) => item.id === filteredItems[0].id);
  const vaoNumber = getVaoNumber(filteredItems[0], index === -1 ? 0 : index);
  return `-vao_${vaoNumber}`;
}

export async function GET(request: Request, { params }: Params) {
  const { osId } = await params;

  const order = await getServiceOrderById(osId);
  if (!order) {
    return NextResponse.json(
      { error: "Medição não encontrada" },
      { status: 404 },
    );
  }

  const [draft, lookups] = await Promise.all([
    getFieldMeasurementDraft(osId, order, order.type),
    listMeasurementLookups(),
  ]);

  const itemIdsParam = new URL(request.url).searchParams.get("itemIds");
  const filteredDraft = itemIdsParam
    ? filterDraftByItemIds(draft, itemIdsParam)
    : draft;

  if (itemIdsParam && !filteredDraft?.items?.length) {
    return NextResponse.json(
      { error: "Nenhum vão encontrado para os itens informados" },
      { status: 404 },
    );
  }

  try {
    const pdfBytes = await generateMeasurementPdf(order, filteredDraft, lookups);

    const displayNumber = getOrderDisplayNumber({
      number: order.number,
      budgetReference: order.budgetReference,
      numeroOrcamento: draft?.numeroOrcamento ?? null,
    });
    const suffix = itemIdsParam ? buildVaoSuffix(draft, filteredDraft) : "";
    const filename = `medicao-${displayNumber.replace(/[^\w.-]+/g, "_")}${suffix}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[measurements/pdf] falha ao gerar PDF:", err);
    return NextResponse.json(
      { error: "Falha ao gerar o PDF da medição" },
      { status: 500 },
    );
  }
}
