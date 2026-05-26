import Link from "next/link";
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
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Plano de corte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Perfis, vidros, acessórios e embalagem.
      </p>

      <ul className="mt-6 space-y-2">
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
                    "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                    allDone
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10"
                      : "border-border bg-card",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">
                      {getOrderDisplayNumber(o)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.clientName}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {STEP_LABELS.map(({ key, label }) => (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          steps[key]
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
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
