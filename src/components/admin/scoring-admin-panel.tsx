"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  updateScoringRuleAction,
  EVENT_TYPE_LABELS,
  type ScoringActionResult,
} from "@/actions/scoring-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ScoringRule, WorkEventType } from "@/db/schema";

type ScoringAdminPanelProps = {
  rules: ScoringRule[];
};

type RuleFormProps = {
  rule: ScoringRule;
};

function RuleForm({ rule }: RuleFormProps) {
  const [state, action, pending] = useActionState<ScoringActionResult | null, FormData>(
    updateScoringRuleAction,
    null,
  );

  const label = EVENT_TYPE_LABELS[rule.eventType as WorkEventType] ?? rule.eventType;

  return (
    <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
      <form action={action} className="space-y-4">
        <input type="hidden" name="eventType" value={rule.eventType} />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tipo: <code className="font-mono">{rule.eventType}</code>
            </p>
          </div>
          <Badge variant={rule.active ? "default" : "secondary"}>
            {rule.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`points-${rule.eventType}`}>Pontos por conclusão</Label>
            <Input
              id={`points-${rule.eventType}`}
              name="points"
              type="number"
              min={0}
              max={9999}
              defaultValue={rule.points}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`active-${rule.eventType}`}>Status</Label>
            <select
              id={`active-${rule.eventType}`}
              name="active"
              defaultValue={rule.active ? "true" : "false"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="true">Ativo — pontua</option>
              <option value="false">Inativo — não pontua</option>
            </select>
          </div>
        </div>

        {state && (
          <Alert variant={state.success ? "default" : "destructive"} className="py-2">
            <AlertDescription className="text-sm">{state.message}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar pontuação
        </Button>
      </form>
    </div>
  );
}

export function ScoringAdminPanel({ rules }: ScoringAdminPanelProps) {
  const ordered: WorkEventType[] = ["corte_vao", "transporte_vao", "instalacao_vao", "medicao"];

  const sortedRules = ordered
    .map((type) => rules.find((r) => r.eventType === type))
    .filter(Boolean) as ScoringRule[];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sortedRules.map((rule) => (
        <RuleForm key={rule.eventType} rule={rule} />
      ))}
    </div>
  );
}
