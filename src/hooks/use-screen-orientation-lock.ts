"use client";

import { useCallback, useEffect, useRef } from "react";

function resolveLockOrientation(): OrientationLockType {
  if (typeof window === "undefined") return "portrait";

  const type = screen.orientation?.type ?? "";
  return type.startsWith("landscape") ? "landscape" : "portrait";
}

async function tryLockOrientation(
  orientation: OrientationLockType,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!screen.orientation?.lock) return false;

  try {
    await screen.orientation.lock(orientation);
    return true;
  } catch {
    return false;
  }
}

function tryUnlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // API indisponível ou bloqueio não estava ativo.
  }
}

type ScreenOrientationLockControls = {
  relockPage: () => void;
  lockLandscape: () => void;
};

/** Trava a orientação da tela enquanto `enabled` for true. */
export function useScreenOrientationLock(
  enabled = true,
): ScreenOrientationLockControls {
  const pageOrientationRef = useRef<OrientationLockType>("portrait");

  const relockPage = useCallback(() => {
    void tryLockOrientation(pageOrientationRef.current);
  }, []);

  const lockLandscape = useCallback(() => {
    void tryLockOrientation("landscape");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    pageOrientationRef.current = resolveLockOrientation();
    void tryLockOrientation(pageOrientationRef.current);

    return () => {
      tryUnlockOrientation();
    };
  }, [enabled]);

  return { relockPage, lockLandscape };
}

export { tryUnlockOrientation };
