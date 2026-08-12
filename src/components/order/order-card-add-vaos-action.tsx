"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

type OrderCardAddVaosActionProps = {
  osId: string;
};

/** Ícone para admin adicionar vãos em OS já no plano de corte. */
export function OrderCardAddVaosAction({ osId }: OrderCardAddVaosActionProps) {
  return (
    <div
      className="flex shrink-0 items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Link
        href={`/field/${osId}?addVaos=1`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Adicionar vãos"
        title="Adicionar vãos"
      >
        <Plus className="h-4 w-4" />
      </Link>
    </div>
  );
}
