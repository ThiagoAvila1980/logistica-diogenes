"use server";

import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { createBiometricChallengeToken, verifyBiometricChallengeToken } from "@/lib/auth/biometric-challenge";
import { requiresBiometricConfirmation } from "@/lib/auth/biometric-steps";
import type { BiometricConfirmation } from "@/lib/auth/biometric-types";
import {
  findPasskeyByCredentialId,
  listPasskeysForUser,
  savePasskey,
  updatePasskeyCounter,
} from "@/lib/auth/passkey-store";
import { getSession } from "@/lib/auth/session";
import {
  getWebAuthnHostError,
  resolveWebAuthnConfig,
} from "@/lib/auth/webauthn-config";
import { isDevBiometricFallbackAllowed } from "@/lib/auth/biometric-challenge";
import { ADVANCE_TARGET_STATUSES } from "@/lib/workflow/advance-flow";

const stepInputSchema = z.object({
  osId: z.string().uuid(),
  nextStatus: z.enum(ADVANCE_TARGET_STATUSES),
  clientOrigin: z.string().url().optional(),
});

export type PasskeyStepResult =
  | {
      success: true;
      challengeToken: string;
      step: "register" | "authenticate";
      options:
        | PublicKeyCredentialCreationOptionsJSON
        | PublicKeyCredentialRequestOptionsJSON;
      expiresAt: number;
      devFallbackAllowed: boolean;
    }
  | { success: false; message: string };

export async function preparePasskeyStep(
  input: z.infer<typeof stepInputSchema>,
): Promise<PasskeyStepResult> {
  const parsed = stepInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos" };
  }

  const session = await getSession();
  if (!session) {
    return { success: false, message: "Faça login para confirmar com biometria" };
  }

  const { osId, nextStatus, clientOrigin } = parsed.data;
  if (!requiresBiometricConfirmation(nextStatus)) {
    return { success: false, message: "Esta etapa não exige confirmação biométrica" };
  }

  const { rpName, rpID, origin } = await resolveWebAuthnConfig(clientOrigin);
  const hostError = getWebAuthnHostError(rpID);
  if (hostError && !isDevBiometricFallbackAllowed()) {
    return { success: false, message: hostError };
  }

  const { token, challenge, expiresAt } = createBiometricChallengeToken(
    osId,
    nextStatus,
  );
  const challengeBytes = new Uint8Array(challenge);
  const passkeys = await listPasskeysForUser(session.userId);
  const userIdBytes = new TextEncoder().encode(session.userId);

  if (passkeys.length === 0) {
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: session.email,
      userDisplayName: session.name,
      userID: userIdBytes,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      challenge: challengeBytes,
    });

    return {
      success: true,
      challengeToken: token,
      step: "register",
      options,
      expiresAt,
      devFallbackAllowed: isDevBiometricFallbackAllowed(),
    };
  }

  const options = await generateAuthenticationOptions({
    rpID,
    challenge: challengeBytes,
    userVerification: "required",
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports,
    })),
  });

  return {
    success: true,
    challengeToken: token,
    step: "authenticate",
    options,
    expiresAt,
    devFallbackAllowed: isDevBiometricFallbackAllowed(),
  };
}

const registerCompleteSchema = z.object({
  osId: z.string().uuid(),
  nextStatus: z.enum(ADVANCE_TARGET_STATUSES),
  challengeToken: z.string().min(1),
  clientOrigin: z.string().url().optional(),
  registration: z.custom<RegistrationResponseJSON>(),
});

export async function completePasskeyRegistration(
  input: z.infer<typeof registerCompleteSchema>,
): Promise<
  | { success: true; confirmation: BiometricConfirmation }
  | { success: false; message: string }
> {
  const parsed = registerCompleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Dados de registro inválidos" };
  }

  const session = await getSession();
  if (!session) {
    return { success: false, message: "Sessão expirada" };
  }

  const { osId, nextStatus, challengeToken, clientOrigin, registration } =
    parsed.data;
  const tokenCheck = verifyBiometricChallengeToken(
    challengeToken,
    osId,
    nextStatus,
  );
  if (!tokenCheck.valid) {
    return { success: false, message: tokenCheck.reason };
  }

  const { rpID, origin } = await resolveWebAuthnConfig(clientOrigin);
  const expectedChallenge = isoBase64URL.fromBuffer(
    new Uint8Array(tokenCheck.challenge),
  );

  try {
    const verification = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, message: "Registro biométrico não verificado" };
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await savePasskey(session.userId, {
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports,
    });

    return {
      success: true,
      confirmation: {
        challengeToken,
        credentialId: credential.id,
        clientDataJSON: registration.response.clientDataJSON,
        authenticatorData: registration.response.attestationObject,
        confirmedAt: new Date().toISOString(),
        authMethod: "webauthn",
        userId: session.userId,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    };
  } catch (err) {
    console.error("[completePasskeyRegistration]", err);
    return { success: false, message: "Falha ao registrar passkey" };
  }
}

const authCompleteSchema = z.object({
  osId: z.string().uuid(),
  nextStatus: z.enum(ADVANCE_TARGET_STATUSES),
  challengeToken: z.string().min(1),
  clientOrigin: z.string().url().optional(),
  authentication: z.custom<AuthenticationResponseJSON>(),
});

export async function completePasskeyAuthentication(
  input: z.infer<typeof authCompleteSchema>,
): Promise<
  | { success: true; confirmation: BiometricConfirmation }
  | { success: false; message: string }
> {
  const parsed = authCompleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Dados de autenticação inválidos" };
  }

  const session = await getSession();
  if (!session) {
    return { success: false, message: "Sessão expirada" };
  }

  const { osId, nextStatus, challengeToken, clientOrigin, authentication } =
    parsed.data;
  const tokenCheck = verifyBiometricChallengeToken(
    challengeToken,
    osId,
    nextStatus,
  );
  if (!tokenCheck.valid) {
    return { success: false, message: tokenCheck.reason };
  }

  const passkey = await findPasskeyByCredentialId(authentication.id);
  if (!passkey || passkey.userId !== session.userId) {
    return { success: false, message: "Passkey não encontrada para este usuário" };
  }

  const { rpID, origin } = await resolveWebAuthnConfig(clientOrigin);
  const expectedChallenge = isoBase64URL.fromBuffer(
    new Uint8Array(tokenCheck.challenge),
  );

  try {
    const verification = await verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { success: false, message: "Autenticação biométrica não verificada" };
    }

    await updatePasskeyCounter(
      passkey.credentialId,
      verification.authenticationInfo.newCounter,
    );

    return {
      success: true,
      confirmation: {
        challengeToken,
        credentialId: authentication.id,
        clientDataJSON: authentication.response.clientDataJSON,
        authenticatorData: authentication.response.authenticatorData,
        confirmedAt: new Date().toISOString(),
        authMethod: "webauthn",
        userId: session.userId,
      },
    };
  } catch (err) {
    console.error("[completePasskeyAuthentication]", err);
    return { success: false, message: "Falha na autenticação biométrica" };
  }
}
