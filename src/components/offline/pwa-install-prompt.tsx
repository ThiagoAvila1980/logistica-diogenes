"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { consumePwaPromptCookie } from "@/lib/pwa/pwa-prompt-cookie.client";

const STORAGE_KEY = "pwa-install-dismissed";
const PROMPT_WAIT_MS = 1500;

type InstallState =
  | "idle"
  | "prompt-available"
  | "ios-guide"
  | "android-guide"
  | "dismissed";

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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [state, setState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isRunningStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    if (!consumePwaPromptCookie()) return;

    if (isIos()) {
      const timer = setTimeout(() => setState("ios-guide"), PROMPT_WAIT_MS);
      return () => clearTimeout(timer);
    }

    let promptReceived = false;

    const handler = (e: Event) => {
      e.preventDefault();
      promptReceived = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("prompt-available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    const fallbackTimer = window.setTimeout(() => {
      if (promptReceived || isRunningStandalone()) return;
      if (isAndroidMobile()) {
        setState("android-guide");
      }
    }, PROMPT_WAIT_MS + 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.clearTimeout(fallbackTimer);
    };
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
              Instalar app
            </DialogTitle>
            <DialogDescription>
              Instale o app para acesso rápido pela tela inicial e melhor
              experiência offline nas medições em campo.
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
                <p>Deseja instalar o app no iPhone/iPad?</p>
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={dismiss} className="w-full">
              Agora não
            </Button>
            <Button onClick={dismiss} className="w-full">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "android-guide") {
    return (
      <Dialog open onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Instalar app
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Deseja instalar o app no celular?</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Toque no menu <strong>⋮</strong> do Chrome
                  </li>
                  <li>
                    Selecione <strong>Instalar app</strong> ou{" "}
                    <strong>Adicionar à tela inicial</strong>
                  </li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={dismiss} className="w-full">
              Agora não
            </Button>
            <Button onClick={dismiss} className="w-full">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
