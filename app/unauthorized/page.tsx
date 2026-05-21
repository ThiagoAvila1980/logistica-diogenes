import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getDefaultRouteForRoles } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ from?: string }>;
};

export default async function UnauthorizedPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { from } = await searchParams;
  const homeHref = getDefaultRouteForRoles(session.roles);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <CardTitle>Acesso negado</CardTitle>
          <CardDescription>
            Seu perfil ({session.name}) não tem permissão para acessar esta
            área.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {from && (
            <p className="rounded-md bg-muted px-3 py-2 text-center font-mono text-xs text-muted-foreground">
              {from}
            </p>
          )}
          <Button asChild className="w-full">
            <Link href={homeHref}>Ir para minha área</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Trocar usuário</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
