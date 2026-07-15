import Link from "next/link";
import { CheckCircle2, Circle, Hammer, GlassWater, Sparkles, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { ConcludedOrderItem } from "@/lib/data/concluded-orders";

type Props = {
  order: ConcludedOrderItem;
};

export function ConcludedOrderCard({ order }: Props) {
  const allDone =
    order.totalVaos > 0 &&
    order.vaos.every((v) => v.concluido);

  return (
    <Link
      href={`/installation/${order.id}`}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-all premium-card",
        allDone
          ? "border-success-border hover:shadow-[0_4px_24px_-8px_rgba(34,197,94,0.25)]"
          : "border-primary/10 hover:border-primary/30 hover:shadow-[var(--shadow-brand)]",
        "active:scale-[0.98]",
      )}
    >
      {/* Cabeçalho */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 font-mono text-sm font-semibold text-primary">
              {order.displayNumber}
            </span>
            <PriorityBadge priority={order.priority} />
          </div>
          <p className="truncate font-medium leading-tight" title={order.clientName}>
            {order.clientName}
          </p>
          <p className="text-xs text-muted-foreground">{STATUS_LABELS[order.status]}</p>
        </div>
        {allDone && (
          <BadgeCheck className="h-5 w-5 shrink-0 text-success" aria-label="Instalação concluída" />
        )}
      </div>

      {/* Progresso agregado */}
      {order.totalVaos > 0 && (
        <div className="space-y-1.5">
          <ProgressRow
            icon={Hammer}
            label="Estrutural"
            done={order.estruturalCount}
            total={order.totalVaos}
          />
          <ProgressRow
            icon={GlassWater}
            label="Vidros"
            done={order.vidrosCount}
            total={order.totalVaos}
          />
          <ProgressRow
            icon={Sparkles}
            label="Acabamento"
            done={order.acabamentoCount}
            total={order.totalVaos}
          />
        </div>
      )}

      {/* Vãos individuais */}
      {order.totalVaos > 0 && (
        <ul className="space-y-1 border-t border-border/50 pt-2">
          {order.vaos.map((vao) => {
            const vaoAllDone = vao.concluido;
            const vaoParcial = !vao.concluido && (vao.estrutural || vao.vidros || vao.acabamento);

            return (
              <li
                key={vao.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-[11px]",
                  vaoAllDone && "text-success-foreground",
                  !vaoAllDone && vaoParcial && "text-amber-700 dark:text-amber-400",
                  !vaoParcial && "text-muted-foreground",
                )}
              >
                <span className="min-w-0 truncate" title={vao.installerName ?? undefined}>
                  <span className="font-medium">{vao.label}:</span>{" "}
                  {vao.installerName ?? "Instalador não informado"}
                </span>
                <span
                  className="flex shrink-0 gap-0.5"
                  title={`${vao.estrutural ? "estrutural ✓" : "estrutural ✗"} · ${vao.vidros ? "vidros ✓" : "vidros ✗"} · ${vao.acabamento ? "acabamento ✓" : "acabamento ✗"}`}
                  aria-hidden
                >
                  {vao.estrutural ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <Circle className="h-3 w-3 opacity-40" />
                  )}
                  {vao.vidros ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <Circle className="h-3 w-3 opacity-40" />
                  )}
                  {vao.acabamento ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <Circle className="h-3 w-3 opacity-40" />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}

function ProgressRow({
  icon: Icon,
  label,
  done,
  total,
}: {
  icon: React.ElementType;
  label: string;
  done: number;
  total: number;
}) {
  const isAll = done === total;
  const fraction = total > 0 ? done / total : 0;

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", isAll ? "text-success" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="w-14 text-[11px] text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isAll ? "bg-success" : "bg-success/50",
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "w-8 text-right text-[11px] tabular-nums",
          isAll ? "font-semibold text-success" : "text-muted-foreground",
        )}
      >
        {done}/{total}
      </span>
    </div>
  );
}
