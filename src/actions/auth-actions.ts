"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { useMockData } from "@/lib/data/config";
import {
  DEMO_USERS,
  getDemoUserByEmail,
} from "@/lib/auth/demo-users";
import { clearSession, getSession, setSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session-types";
import { resolvePostLoginPathDynamic } from "@/lib/auth/login-redirect";
import { setPwaPromptPendingCookie } from "@/lib/pwa/pwa-prompt-cookie";
import { DEMO_DEFAULT_PASSWORD } from "@/lib/auth/demo-password";
import { verifyPassword } from "@/lib/auth/password";
import { users } from "@/db/schema";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

export type LoginState =
  | { success: false; message: string }
  | null;

export type LoginUserOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

/** Lista usuários. Em produção exige sessão de admin/gerente. */
export async function listLoginUsers(): Promise<LoginUserOption[]> {
  if (useMockData()) {
    return DEMO_USERS.map(({ id, name, email, roles }) => ({
      id,
      name,
      email,
      roles,
    }));
  }

  // Em produção apenas admins e gerentes podem enumerar usuários
  const { requireRole } = await import("@/lib/auth/require-role");
  try {
    await requireRole(["admin", "gerente"]);
  } catch {
    return [];
  }

  const { getDb } = await import("@/db");
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
    })
    .from(users)
    .where(eq(users.active, true));

  return rows;
}

export async function loginWithCredentials(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      first.email?.[0] ?? first.password?.[0] ?? "Dados inválidos";
    return { success: false, message };
  }

  const { email, password, next } = parsed.data;

  if (useMockData()) {
    const user = getDemoUserByEmail(email);
    if (!user || password !== DEMO_DEFAULT_PASSWORD) {
      return { success: false, message: "E-mail ou senha incorretos" };
    }
    await setSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    });
    await setPwaPromptPendingCookie();
    redirect(await resolvePostLoginPathDynamic(next, user.roles));
  }

  const { getDb } = await import("@/db");
  const db = getDb();

  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roles: users.roles,
        active: users.active,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user?.active) {
      return { success: false, message: "E-mail ou senha incorretos" };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, message: "E-mail ou senha incorretos" };
    }

    await setSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    });
    await setPwaPromptPendingCookie();
    redirect(await resolvePostLoginPathDynamic(next, user.roles));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("password_hash")) {
      return {
        success: false,
        message:
          "Banco desatualizado: rode npm run db:fix-auth para aplicar a migration de senha.",
      };
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  return getSession();
}
