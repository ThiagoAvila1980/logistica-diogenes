import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { useMockData } from "@/lib/data/config";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <Card className="premium-card overflow-hidden border-0 shadow-[var(--shadow-brand)]">
      <div className="brand-panel relative px-6 py-5 lg:hidden">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brass" aria-hidden />
        <CardTitle className="text-primary-foreground">
          Fluxo <span className="text-brass">Diógenes</span>
        </CardTitle>
        <CardDescription className="text-primary-foreground/70">
          Gestão de vidraçaria
        </CardDescription>
      </div>

      <CardHeader className="hidden lg:block">
        <div className="brass-rule mb-3" aria-hidden />
        <CardTitle className="text-primary">Entrar</CardTitle>
        <CardDescription>
          Use e-mail e senha. A biometria será cadastrada na primeira confirmação
          de etapa.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-6 pt-5 sm:px-6 lg:pt-0">
        <p className="mb-4 text-sm text-muted-foreground lg:hidden">
          Entre com e-mail e senha para continuar.
        </p>
        <LoginForm nextPath={next} showDemoHint={useMockData()} />
      </CardContent>
    </Card>
  );
}
