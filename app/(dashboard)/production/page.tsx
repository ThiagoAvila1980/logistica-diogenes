import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";
import { listServiceOrders } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { hasPendingCuttingSteps } from "@/lib/transport-gates";
import { cn } from "@/lib/utils";

const CUTTING_STATUSES = new Set(["cortes", "embalagem", "acessorios_plano"]);

const STEP_LABELS = [
  { key: "corte" as const, label: "Corte" },
  { key: "embalagem" as const, label: "Embal." },
  { key: "acessorios" as const, label: "Acess." },
];

export default async function ProductionIndexPage() {
  const allOrders = await listServiceOrders();
  const candidateOrders = allOrders.filter(
    (o) =>
      CUTTING_STATUSES.has(o.status) || o.status.startsWith("transporte_"),
  );

  const detailsEntries = await Promise.all(
    candidateOrders.map(async (o) => {
      const detail = await getCuttingDetailForOs(o.id);
      return [o.id, detail.cuttingSteps] as const;
    }),
  );
  const stepsMap = Object.fromEntries(detailsEntries);

  const orders = candidateOrders.filter((o) => {
    const steps = stepsMap[o.id];
    if (!steps) return CUTTING_STATUSES.has(o.status);
    return hasPendingCuttingSteps({
      corteFeito: steps.corte,
      embalagemFeita: steps.embalagem,
      acessoriosFeitos: steps.acessorios,
    });
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Plano de corte"
        count={orders.length}
        description="Perfis, vidros, acessórios e embalagem."
      />

      <ul className="space-y-3">
        {orders.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Nenhuma medição nesta etapa.
          </li>
        ) : (
          orders.map((o) => {
            const steps = stepsMap[o.id] ?? {
              corte: false,
              embalagem: false,
              acessorios: false,
            };
            const doneCount = Object.values(steps).filter(Boolean).length;
            const allDone = doneCount === 3;

            return (
              <li key={o.id}>
                <Link
                  href={`/production/${o.id}`}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border px-4 py-3 transition-all hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:flex-row sm:items-center",
                    allDone
                      ? "border-success-border bg-success-muted premium-card"
                      : "border-primary/10 bg-card premium-card",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-primary">
                      {getOrderDisplayNumber(o)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.clientName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                    {STEP_LABELS.map(({ key, label }) => (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          steps[key]
                            ? "bg-success-subtle text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
