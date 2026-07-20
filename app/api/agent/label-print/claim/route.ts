import { NextResponse } from "next/server";
import { assertLabelPrintAgentToken } from "@/lib/labels/agent-auth";
import { claimNextLabelPrintJobSafe } from "@/lib/labels/print-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertLabelPrintAgentToken(request);
  if (denied) return denied;

  try {
    const job = await claimNextLabelPrintJobSafe();
    if (!job) {
      return NextResponse.json({ ok: true, job: null });
    }

    return NextResponse.json({
      ok: true,
      job: { id: job.id, raw: job.raw },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/agent/label-print/claim]", message);
    const missingTable =
      /label_print_jobs/i.test(message) &&
      /does not exist|não existe|relation/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        error: missingTable
          ? "Tabela label_print_jobs ausente. Execute a migration 0003_label_print_jobs.sql no banco de produção."
          : message,
      },
      { status: 500 },
    );
  }
}
