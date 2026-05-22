"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] Erro na rota:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">Erro ao carregar o painel</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Isso pode acontecer após salvar alterações no código durante o
        desenvolvimento. Tente recarregar; se persistir, reinicie o servidor com{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          npm run dev:clean
        </code>
        .
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </Button>
      </div>
    </div>
  );
}
