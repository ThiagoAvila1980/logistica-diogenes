"use client";

import { useEffect, useState } from "react";
import { getNetworkMonitor } from "@/lib/offline/network-monitor";

export type NetworkStatus = "online" | "offline" | "unknown";

/**
 * Estado reativo de conectividade de rede.
 * Usa o NetworkMonitor singleton que faz ping real ao servidor.
 */
export function useNetworkStatus(): NetworkStatus {
  // Sempre inicia com "unknown" em servidor e cliente para evitar mismatch de
  // hidratação. O estado real é definido no useEffect (pós-hidratação).
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    const monitor = getNetworkMonitor();

    setStatus(monitor.isOnline ? "online" : "offline");

    const unsubscribe = monitor.subscribe((isOnline) => {
      setStatus(isOnline ? "online" : "offline");
    });

    return unsubscribe;
  }, []);

  return status;
}

export function useIsOffline(): boolean {
  return useNetworkStatus() === "offline";
}
