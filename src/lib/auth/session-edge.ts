import { parseSessionPayload } from "./session-parse";
import type { SessionUser } from "./session-types";

function getSecret(): string {
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

function base64UrlToBytes(base64url: string): Uint8Array {
  const padded =
    base64url.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (base64url.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Parser de sessão compatível com Edge (middleware). */
export async function parseSessionFromToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = bytesToBase64Url(signature);
  if (expected !== sig) return null;

  try {
    const raw = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    return parseSessionPayload(raw);
  } catch {
    return null;
  }
}
