import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { BiometricChallengePayload } from "./biometric-types";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function getBiometricSecret(): string {
  return (
    process.env.BIOMETRIC_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "fluxo-diogenes-dev-biometric-secret"
  );
}

function signPayload(payload: BiometricChallengePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getBiometricSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function parseToken(token: string): BiometricChallengePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", getBiometricSecret())
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
    const json = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as BiometricChallengePayload;
    if (
      typeof json.osId !== "string" ||
      typeof json.nextStatus !== "string" ||
      typeof json.nonce !== "string" ||
      typeof json.exp !== "number"
    ) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

export function createBiometricChallengeToken(
  osId: string,
  nextStatus: string,
): { token: string; challenge: Uint8Array; expiresAt: number } {
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const payload: BiometricChallengePayload = {
    osId,
    nextStatus,
    nonce: randomBytes(16).toString("hex"),
    exp: expiresAt,
  };
  const token = signPayload(payload);
  const challenge = Uint8Array.from(
    createHmac("sha256", getBiometricSecret())
      .update(token)
      .digest(),
  );
  return { token, challenge, expiresAt };
}

export function verifyBiometricChallengeToken(
  token: string,
  osId: string,
  nextStatus: string,
): { valid: true; challenge: Uint8Array } | { valid: false; reason: string } {
  const payload = parseToken(token);
  if (!payload) {
    return { valid: false, reason: "Token de desafio inválido" };
  }
  if (payload.exp < Date.now()) {
    return { valid: false, reason: "Desafio biométrico expirado" };
  }
  if (payload.osId !== osId || payload.nextStatus !== nextStatus) {
    return { valid: false, reason: "Desafio não corresponde à OS ou etapa" };
  }
  const challenge = Uint8Array.from(
    createHmac("sha256", getBiometricSecret())
      .update(token)
      .digest(),
  );
  return { valid: true, challenge };
}

export function challengeMatchesClientData(
  challenge: Uint8Array,
  clientDataJSONBase64: string,
): boolean {
  try {
    const clientData = JSON.parse(
      Buffer.from(clientDataJSONBase64, "base64url").toString("utf8"),
    ) as { challenge?: string; type?: string };
    if (
      clientData.type !== "webauthn.get" &&
      clientData.type !== "webauthn.create"
    ) {
      return false;
    }
    if (!clientData.challenge) return false;
    const fromClient = Buffer.from(clientData.challenge, "base64url");
    const expected = Buffer.from(challenge);
    return (
      fromClient.length === expected.length &&
      timingSafeEqual(fromClient, expected)
    );
  } catch {
    return false;
  }
}

export function isDevBiometricFallbackAllowed(): boolean {
  return process.env.BIOMETRIC_ALLOW_DEV_FALLBACK === "true";
}
