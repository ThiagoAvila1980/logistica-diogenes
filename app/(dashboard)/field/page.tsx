import { listServiceOrders } from "@/lib/data/orders";

import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";

import { CreateMeasurementDialog } from "@/components/field/create-measurement-dialog";

import { getSession } from "@/lib/auth/session";

import { hasAnyRole } from "@/lib/auth/permissions";

import { Ruler } from "lucide-react";



export default async function FieldIndexPage() {

  const session = await getSession();

  const canCreate = hasAnyRole(session?.roles ?? [], ["admin", "gerente"]);



  const orders = await listServiceOrders();

  const fieldOrders = orders.filter((o) => o.status.startsWith("medicao"));



  return (

    <div className="space-y-6">

      <header>

        <div className="flex flex-wrap items-start justify-between gap-3">

          <div>

            <div className="flex items-center gap-2">

              <Ruler className="h-6 w-6 text-primary" aria-hidden />

              <h1 className="text-xl font-bold sm:text-2xl">Medições</h1>

            </div>

            <p className="mt-2 max-w-xl text-sm text-muted-foreground">

              {canCreate

                ? "Crie uma medição anexando o PDF do orçamento. O medidor registra as medidas exatas no local."

                : "Selecione uma medição para registrar as medidas exatas no local."}

            </p>

          </div>

          {canCreate && <CreateMeasurementDialog />}

        </div>

      </header>



      {fieldOrders.length === 0 ? (

        <div className="rounded-xl border border-dashed bg-card p-8 text-center">

          <p className="text-sm text-muted-foreground">

            {canCreate

              ? "Nenhuma medição pendente. Toque em Nova Medição para iniciar."

              : "Nenhuma medição pendente no momento."}

          </p>

        </div>

      ) : (

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">

          {fieldOrders.map((order) => (

            <li key={order.id}>

              <FieldOrderCardWithDelete order={order} canDelete={canCreate} />

            </li>

          ))}

        </ul>

      )}

    </div>

  );

}

