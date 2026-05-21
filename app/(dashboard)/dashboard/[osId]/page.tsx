import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { useMockData } from "@/lib/data/config";
import { StatusWizardAdvance } from "@/components/workflow/status-wizard-advance";
import { OsStatusBadge } from "@/components/dashboard/os-status-badge";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { MockHints } from "@/components/dashboard/mock-hints";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

type Props = { params: Promise<{ osId: string }> };

export default async function ServiceOrderDetailPage({ params }: Props) {
  const { osId } = await params;
  const order = await getServiceOrderById(osId);

  if (!order) notFound();

  const session = await getSession();
  const userRoles = session?.roles ?? ["admin"];

  const moduleHref = getModuleHref(order.status);

  return (
    <div className="p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Link>
      </Button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold">
              {getOrderDisplayNumber(order)}
            </h1>
            <OsStatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
          <p className="mt-2 text-lg font-medium">{order.clientName}</p>
          {order.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {order.description}
            </p>
          )}
        </div>
        {moduleHref && (
          <Button asChild variant="outline">
            <Link href={`${moduleHref}/${order.id}`}>Abrir módulo →</Link>
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline e ações</CardTitle>
            <CardDescription>
              StatusWizard + OSAdvanceForm (useOSAdvance) com UI otimista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusWizardAdvance order={order} userRoles={userRoles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{order.clientName}</p>
            {order.clientPhone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                {order.clientPhone}
              </p>
            )}
            {order.scheduledDate && (
              <p>
                <span className="text-muted-foreground">Agendado: </span>
                {order.scheduledDate.toLocaleDateString("pt-BR")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <MockHints
          osId={order.id}
          status={order.status}
          enabled={useMockData()}
        />
      </div>
    </div>
  );
}

function getModuleHref(status: string): string | null {
  if (status.startsWith("medicao")) return "/field";
  if (status.includes("orcamento") || status === "aprovado_cliente")
    return "/quote";
  if (
    status === "cortes" ||
    status === "embalagem" ||
    status === "acessorios_plano" ||
    status.includes("corte")
  ) {
    return "/production";
  }
  if (status.startsWith("transporte_") || status.includes("transporte")) {
    return "/logistics";
  }
  if (status.startsWith("instalacao") || status === "concluido")
    return "/installation";
  return null;
}
