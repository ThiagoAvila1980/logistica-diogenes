import { NextResponse } from "next/server";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { sortMeasurementItemsOldestFirst } from "@/lib/measurement/item-order";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
  getVaoNumber,
} from "@/lib/measurement/vao-item-subtitle";
import type { VaoOption } from "@/lib/measurement/vao-item-subtitle";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ osId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
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

  const items = sortMeasurementItemsOldestFirst(draft?.items ?? []);

  const vaos: VaoOption[] = items.map((item, index) => ({
    id: item.id,
    vaoNumber: getVaoNumber(item, index),
    label: formatVaoItemFullLabel(buildVaoItemSubtitle(item, index, lookups)),
  }));

  return NextResponse.json(
    { vaos },
    { headers: { "Cache-Control": "no-store" } },
  );
}
