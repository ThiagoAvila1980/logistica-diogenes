import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLabelPrintJob } from "@/lib/labels/print-jobs";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getLabelPrintJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
