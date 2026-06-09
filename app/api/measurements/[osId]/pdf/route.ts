import { NextResponse } from "next/server";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { generateMeasurementPdf } from "@/lib/pdf/measurement-pdf";
import { getOrderDisplayNumber } from "@/lib/order-display";

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

  try {
    const pdfBytes = await generateMeasurementPdf(order, draft, lookups);

    const displayNumber = getOrderDisplayNumber({
      number: order.number,
      budgetReference: order.budgetReference,
      numeroOrcamento: draft?.numeroOrcamento ?? null,
    });
    const filename = `medicao-${displayNumber.replace(/[^\w.-]+/g, "_")}.pdf`;

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
