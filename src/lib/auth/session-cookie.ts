import { createHmac, timingSafeEqual } from "node:crypto";
import { parseSessionPayload } from "./session-parse";
import type { SessionUser } from "./session-types";

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ?? process.env.BIOMETRIC_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET não definido. Configure a variável de ambiente antes de iniciar em produção.",
    );
  }
  return "fluxo-diogenes-dev-session-secret";
}

export function signSession(user: SessionUser): string {
  const body = Buffer.from(JSON.stringify(user)).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function parseSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return parseSessionPayload(raw);
  } catch {
    return null;
  }
}
