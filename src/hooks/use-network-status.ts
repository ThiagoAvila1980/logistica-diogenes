"use client";

import { useEffect, useState } from "react";
import { getNetworkMonitor } from "@/lib/offline/network-monitor";

export type NetworkStatus = "online" | "offline" | "unknown";

/**
 * Estado reativo de conectividade de rede.
 * Usa o NetworkMonitor singleton que faz ping real ao servidor.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator === "undefined") return "unknown";
    return navigator.onLine ? "online" : "offline";
  });

  useEffect(() => {
    const monitor = getNetworkMonitor();

    // Estado inicial do monitor
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
