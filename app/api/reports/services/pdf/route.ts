import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listServiceJourneyReportRows } from "@/lib/data/service-journey-report";
import { generateServiceJourneyPdf } from "@/lib/pdf/service-journey-pdf";
import {
  filterServiceJourneyRows,
  parseServiceReportFiltersFromSearchParams,
  type ServiceReportFilters,
} from "@/lib/reports/service-report-filters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filters: ServiceReportFilters =
    parseServiceReportFiltersFromSearchParams(searchParams);

  try {
    const rows = await listServiceJourneyReportRows();
    const filteredRows = filterServiceJourneyRows(rows, filters);
    const generatedAt = new Date();
    const pdfBytes = await generateServiceJourneyPdf({
      rows: filteredRows,
      filters,
      generatedAt,
    });

    const filename = `relatorio-servicos-${generatedAt.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[reports/services/pdf] falha ao gerar PDF:", err);
    return NextResponse.json(
      { error: "Falha ao gerar o PDF do relatório" },
      { status: 500 },
    );
  }
}
