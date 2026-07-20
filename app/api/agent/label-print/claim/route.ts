import { NextResponse } from "next/server";
import { assertLabelPrintAgentToken } from "@/lib/labels/agent-auth";
import { claimNextLabelPrintJobSafe } from "@/lib/labels/print-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertLabelPrintAgentToken(request);
  if (denied) return denied;

  const job = await claimNextLabelPrintJobSafe();
  if (!job) {
    return NextResponse.json({ ok: true, job: null });
  }

  return NextResponse.json({
    ok: true,
    job: { id: job.id, raw: job.raw },
  });
}
