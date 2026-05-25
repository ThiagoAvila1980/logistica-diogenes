import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
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
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-xl font-bold sm:text-2xl">Administração</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros e configurações restritas ao administrador.
        </p>
      </header>
      {children}
    </div>
  );
}
