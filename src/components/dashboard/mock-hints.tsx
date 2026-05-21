"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setupDemoPrerequisites } from "@/actions/demo-setup";

export function MockHints({
  osId,
  status,
  enabled,
}: {
  osId: string;
  status: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!enabled) return null;

  return (
    <div className="rounded-lg border border-dashed p-4 text-sm">
      <p className="font-medium">Ferramentas de demo</p>
      <p className="mt-1 text-muted-foreground">
        Libera medição final, corte e embalagem para testar transições bloqueadas.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setupDemoPrerequisites(osId, "measurement");
              router.refresh();
            })
          }
        >
          + Medição final
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setupDemoPrerequisites(osId, "cutting");
              router.refresh();
            })
          }
        >
          + Corte e embalagem OK
        </Button>
        {(status.startsWith("instalacao") ||
          status === "transporte_levar_vidro") && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setupDemoPrerequisites(osId, "installation");
                router.refresh();
              })
            }
          >
            + Fotos (demo)
          </Button>
        )}
      </div>
    </div>
  );
}
