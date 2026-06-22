import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  return children;
}
