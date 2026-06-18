import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SwRegister } from "@/components/offline/sw-register";
import { useMockData } from "@/lib/data/config";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <SwRegister />
      <DashboardShell mockMode={useMockData()} session={session}>
        {children}
      </DashboardShell>
    </>
  );
}
