import { NextResponse } from "next/server";
import { assertLabelPrintAgentToken } from "@/lib/labels/agent-auth";
import { completeLabelPrintJob } from "@/lib/labels/print-jobs";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const denied = assertLabelPrintAgentToken(request);
  if (denied) return denied;

  const { id } = await params;
  let body: { ok?: boolean; error?: string };
  try {
    body = (await request.json()) as { ok?: boolean; error?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.ok === true) {
    const job = await completeLabelPrintJob(id, { ok: true });
    if (!job) {
      return NextResponse.json(
        { error: "Job não encontrado ou já finalizado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, job });
  }

  const error =
    typeof body.error === "string" && body.error.trim()
      ? body.error.trim()
      : "Falha na impressão no agente.";
  const job = await completeLabelPrintJob(id, { ok: false, error });
  if (!job) {
    return NextResponse.json(
      { error: "Job não encontrado ou já finalizado." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, job });
}
