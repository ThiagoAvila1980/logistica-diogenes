import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function getLabelPrintAgentToken(): string {
  return (process.env.LABEL_PRINT_AGENT_TOKEN || "").trim();
}

export function assertLabelPrintAgentToken(
  request: Request,
): NextResponse | null {
  const expected = getLabelPrintAgentToken();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "LABEL_PRINT_AGENT_TOKEN não configurado no servidor. Defina no .env de produção.",
      },
      { status: 503 },
    );
  }

  const got =
    request.headers.get("x-print-token")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  if (!got || got.length !== expected.length) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  return null;
}
