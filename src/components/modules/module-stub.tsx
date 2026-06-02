import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceOrderById, listServiceOrders } from "@/lib/data/orders";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function ModuleIndexPage({
  title,
  description,
  filter,
  basePath,
}: {
  title: string;
  description: string;
  filter: (status: string) => boolean;
  basePath: string;
}) {
  const orders = (await listServiceOrders()).filter((o) => filter(o.status));

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-6 space-y-2">
        {orders.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhuma OS nesta etapa.</li>
        ) : (
          orders.map((o) => (
            <li key={o.id}>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`${basePath}/${o.id}`}>
                  {getOrderDisplayNumber(o)} — {o.clientName}
                </Link>
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export async function ModuleOsPage({
  osId,
  title,
}: {
  osId: string;
  title: string;
}) {
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  return (
    <div className="p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {title} — {getOrderDisplayNumber(order)}
          </CardTitle>
          <CardDescription>{order.clientName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MeasurementNotesCard notes={order.notes} />
          <p className="text-sm text-muted-foreground">
            Módulo em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
