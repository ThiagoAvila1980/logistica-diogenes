"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import {
  loginWithCredentials,
  type LoginState,
} from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEMO_DEFAULT_PASSWORD } from "@/lib/auth/demo-password";

type LoginFormProps = {
  nextPath?: string;
  showDemoHint?: boolean;
};

export function LoginForm({ nextPath, showDemoHint }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<
    LoginState,
    FormData
  >(loginWithCredentials, null);

  return (
    <form action={formAction} className="space-y-4">
      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      {state?.success === false && (
        <Alert variant="destructive">
          <AlertTitle>Login falhou</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          required
          disabled={isPending}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={isPending}
            className="h-11 pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </>
        )}
      </Button>

      {showDemoHint && (
        <p className="text-center text-xs text-muted-foreground">
          Modo demo: senha padrão{" "}
          <code className="rounded bg-muted px-1 py-0.5">{DEMO_DEFAULT_PASSWORD}</code>
        </p>
      )}
    </form>
  );
}
