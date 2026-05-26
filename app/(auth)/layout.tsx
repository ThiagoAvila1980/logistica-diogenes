import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRouteForRoles } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect(getDefaultRouteForRoles(session.roles));
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
