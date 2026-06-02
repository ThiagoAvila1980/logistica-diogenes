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
    <Card className="premium-card w-full overflow-hidden border-0 shadow-[var(--shadow-brand)]">
      <CardHeader className="hidden lg:block">
        <div className="brass-rule mb-3" aria-hidden />
        <CardTitle className="text-primary">Entrar</CardTitle>
        <CardDescription>
          Use e-mail e senha. A biometria será cadastrada na primeira confirmação
          de etapa.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-6 pt-5 sm:px-6 lg:pt-0">
        <p className="mb-4 text-center text-sm text-muted-foreground lg:hidden">
          Entre com e-mail e senha para continuar.
        </p>
        <LoginForm nextPath={next} showDemoHint={useMockData()} />
      </CardContent>
    </Card>
  );
}
