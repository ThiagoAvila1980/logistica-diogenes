import { headers } from "next/headers";

export type WebAuthnConfig = {
  rpName: string;
  rpID: string;
  origin: string;
};

function isIpHost(hostname: string): boolean {
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    hostname.startsWith("[") ||
    hostname.includes(":")
  );
}

export function isWebAuthnRpIdSupported(hostname: string): boolean {
  if (hostname === "localhost") return true;
  if (isIpHost(hostname)) return false;
  return hostname.includes(".");
}

export function getWebAuthnHostError(hostname: string): string | null {
  if (isIpHost(hostname)) {
    return (
      "Biometria não funciona por IP (ex.: 192.168.x.x). " +
      "Use HTTPS com domínio (ngrok, Cloudflare Tunnel ou deploy)."
    );
  }
  if (!isWebAuthnRpIdSupported(hostname)) {
    return "Host inválido para WebAuthn. Use localhost ou um domínio HTTPS.";
  }
  return null;
}

/** Config estática (env) — preferida em produção. */
export function getWebAuthnConfig(): WebAuthnConfig {
  const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
  const origin =
    process.env.WEBAUTHN_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  return {
    rpName: "Fluxo Diógenes",
    rpID,
    origin,
  };
}

async function inferOriginFromRequestHeaders(): Promise<string | null> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return null;

  const proto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  const hostname = host.split(",")[0]?.trim();
  if (!hostname) return null;

  return `${proto}://${hostname}`;
}

/**
 * Resolve rpID/origin para o dispositivo que está confirmando biometria.
 * Em produção, WEBAUTHN_RP_ID + WEBAUTHN_ORIGIN fixos têm prioridade.
 */
export async function resolveWebAuthnConfig(
  clientOrigin?: string,
): Promise<WebAuthnConfig> {
  const envRpId = process.env.WEBAUTHN_RP_ID;
  const envOrigin = process.env.WEBAUTHN_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL;

  if (envRpId && envOrigin) {
    return {
      rpName: "Fluxo Diógenes",
      rpID: envRpId,
      origin: envOrigin.replace(/\/$/, ""),
    };
  }

  const requestOrigin = await inferOriginFromRequestHeaders();
  let origin = clientOrigin ?? requestOrigin ?? getWebAuthnConfig().origin;

  if (clientOrigin && requestOrigin) {
    try {
      const clientUrl = new URL(clientOrigin);
      const requestUrl = new URL(requestOrigin);
      if (clientUrl.host !== requestUrl.host) {
        origin = requestOrigin;
      }
    } catch {
      origin = requestOrigin;
    }
  }

  try {
    const url = new URL(origin);
    return {
      rpName: "Fluxo Diógenes",
      rpID: envRpId ?? url.hostname,
      origin: url.origin,
    };
  } catch {
    return getWebAuthnConfig();
  }
}
