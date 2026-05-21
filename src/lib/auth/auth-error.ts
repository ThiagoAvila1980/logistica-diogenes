import type { SessionUser } from "./session-types";

export type AuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function authErrorMessage(error: unknown): string | null {
  if (error instanceof AuthError) return error.message;
  return null;
}
