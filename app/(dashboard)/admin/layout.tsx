import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Settings2 } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  return (
    <>
      <PageHeading
        title="Administração"
        description="Cadastros e configurações restritas ao administrador."
        icon={Settings2}
      />
      {children}
    </>
  );
}
