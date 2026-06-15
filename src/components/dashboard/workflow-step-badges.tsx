import { cn } from "@/lib/utils";

export type WorkflowStepBadgeItem = {
  label: string;
  done: boolean;
};

type WorkflowStepBadgesProps = {
  steps: WorkflowStepBadgeItem[];
  className?: string;
};

export function WorkflowStepBadges({ steps, className }: WorkflowStepBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {steps.map((step) => (
        <span
          key={step.label}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            step.done
              ? "bg-success-subtle text-success-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

export const TRANSPORT_STEP_LABELS = [
  { key: "levarPerfilEstrutural", label: "Perfil" },
  { key: "levarPerfilTotal", label: "Total" },
  { key: "levarAcessorios", label: "Acess." },
  { key: "levarVidros", label: "Vidr." },
] as const;

export const INSTALLATION_STEP_LABELS = [
  { key: "instalacaoEstruturalFeita", label: "Estru." },
  { key: "instalacaoVidrosFeita", label: "Vidros" },
  { key: "instalacaoAcabamentoFeito", label: "Acab." },
] as const;
