"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "pwa-install-dismissed";

type InstallState = "idle" | "prompt-available" | "ios-guide" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Detecta se está rodando como PWA instalado */
function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

/** Detecta iOS (Safari não tem beforeinstallprompt) */
function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [state, setState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Não exibir se já está instalado ou foi dispensado
    if (isRunningStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    if (isIos()) {
      // iOS: mostrar guia manual após 3s
      const timer = setTimeout(() => setState("ios-guide"), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop Chrome: interceptar evento nativo
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("prompt-available");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setState("dismissed");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setState("dismissed");
    setDeferredPrompt(null);
  }

  if (state === "prompt-available") {
    return (
      <Dialog open onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Instalar app de medições
            </DialogTitle>
            <DialogDescription>
              Instale o app para usar sem internet e ter acesso rápido pela tela
              inicial do celular.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={dismiss} className="w-full">
              Agora não
            </Button>
            <Button onClick={handleInstall} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Instalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "ios-guide") {
    return (
      <Dialog open onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-5 w-5 text-primary" />
              Adicionar à tela inicial
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Para instalar no iPhone/iPad e usar offline:</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Toque no ícone de{" "}
                    <Share className="inline h-4 w-4 align-middle" />{" "}
                    <strong>Compartilhar</strong> na barra do Safari
                  </li>
                  <li>
                    Role para baixo e toque em{" "}
                    <strong>Adicionar à Tela Inicial</strong>
                  </li>
                  <li>Confirme tocando em Adicionar</li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismiss} className="w-full">
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
