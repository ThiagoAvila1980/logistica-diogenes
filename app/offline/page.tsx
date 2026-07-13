import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <WifiOff className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Sem conexão</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta página ainda não foi aberta neste dispositivo, então não está
          disponível offline. Suas medições salvas continuam seguras e serão
          sincronizadas assim que a conexão voltar.
        </p>
      </div>
      <a
        href="/field"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Tentar novamente
      </a>
    </div>
  );
}
