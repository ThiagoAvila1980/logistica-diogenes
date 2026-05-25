import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDraft } from "@/lib/data/installation";
import { InstallationForm } from "@/components/installation/installation-form";
import { getSession } from "@/lib/auth/session";

type Props = { params: Promise<{ osId: string }> };

export default async function InstallationOsPage({ params }: Props) {
  const { osId } = await params;
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  if (
    !order.status.startsWith("instalacao") &&
    order.status !== "concluido"
  ) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta OS não está em etapa de instalação (status: {order.status}).
        </p>
      </div>
    );
  }

  const initial = await getInstallationDraft(osId);
  const session = await getSession();
  const userRoles = session?.roles ?? ["instalador"];

  return (
    <InstallationForm
      order={order}
      initial={initial}
      userRoles={userRoles}
    />
  );
}
