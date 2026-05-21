import { z } from "zod";

export const biometricConfirmationSchema = z.object({
  challengeToken: z.string().min(1),
  credentialId: z.string().min(1),
  clientDataJSON: z.string().min(1),
  authenticatorData: z.string().min(1),
  confirmedAt: z.string().datetime(),
  authMethod: z.enum(["webauthn", "dev_fallback"]),
  userId: z.string().uuid().optional(),
  deviceType: z.string().optional(),
  backedUp: z.boolean().optional(),
});

export type BiometricConfirmation = z.infer<typeof biometricConfirmationSchema>;

export type BiometricChallengePayload = {
  osId: string;
  nextStatus: string;
  nonce: string;
  exp: number;
};
