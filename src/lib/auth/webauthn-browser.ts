export type WebAuthnSupport = {
  available: boolean;
  secureContext: boolean;
  apiPresent: boolean;
  reason: string | null;
};

export function getWebAuthnSupport(): WebAuthnSupport {
  if (typeof window === "undefined") {
    return {
      available: false,
      secureContext: false,
      apiPresent: false,
      reason: "WebAuthn indisponível no servidor.",
    };
  }

  const secureContext = window.isSecureContext;
  const apiPresent =
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined";

  if (!secureContext) {
    return {
      available: false,
      secureContext: false,
      apiPresent,
      reason:
        "Biometria exige conexão segura (HTTPS). No celular, acesse via túnel HTTPS " +
        "(ngrok, Cloudflare Tunnel) ou use o ambiente de produção — IP local em HTTP não abre o sensor.",
    };
  }

  if (!apiPresent) {
    return {
      available: false,
      secureContext: true,
      apiPresent: false,
      reason:
        "Este navegador não suporta WebAuthn/passkeys. Tente Chrome ou Safari atualizados.",
    };
  }

  const hostname = window.location.hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return {
      available: false,
      secureContext: true,
      apiPresent: true,
      reason:
        "WebAuthn não funciona por IP (192.168.x.x). Use um domínio HTTPS " +
        "(ex.: ngrok http 3000) e configure WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN no .env.local.",
    };
  }

  return {
    available: true,
    secureContext: true,
    apiPresent: true,
    reason: null,
  };
}

export function isWebAuthnAvailable(): boolean {
  return getWebAuthnSupport().available;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  const support = getWebAuthnSupport();
  if (!support.available) return false;

  if (
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !==
    "function"
  ) {
    return true;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createDevFallbackConfirmation(
  challengeToken: string,
  userId?: string,
): import("@/lib/auth/biometric-types").BiometricConfirmation {
  return {
    challengeToken,
    credentialId: "dev-fallback-credential",
    clientDataJSON: bufferToBase64url(
      new TextEncoder().encode(
        JSON.stringify({ type: "dev.fallback", challengeToken }),
      ),
    ),
    authenticatorData: bufferToBase64url(new Uint8Array([0])),
    confirmedAt: new Date().toISOString(),
    authMethod: "dev_fallback",
    userId,
  };
}
