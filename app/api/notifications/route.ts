import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";
import { listNotificationsForUser } from "@/lib/data/notifications-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!hasAnyRole(session.roles, ["admin", "gerente"])) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const data = await listNotificationsForUser(session.userId);
  return NextResponse.json(data);
}
