/**
 * Detecção robusta de conectividade.
 *
 * navigator.onLine pode retornar true mesmo sem internet real (rede local sem saída).
 * Fazemos um ping HEAD ao próprio servidor para confirmar conectividade real.
 */

const PING_URL = "/api/ping";
const PING_TIMEOUT_MS = 5000;

/** Verifica conectividade real fazendo uma requisição ao servidor */
export async function checkRealConnectivity(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const response = await fetch(PING_URL, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

type NetworkListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkListener> = new Set();
  private _isOnline: boolean = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this._isOnline = navigator.onLine;
      window.addEventListener("online", this.handleBrowserOnline);
      window.addEventListener("offline", this.handleBrowserOffline);
      this.startPeriodicPing();
    }
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(isOnline: boolean) {
    if (this._isOnline === isOnline) return;
    this._isOnline = isOnline;
    this.listeners.forEach((fn) => fn(isOnline));
  }

  private handleBrowserOnline = () => {
    // Confirmar com ping real antes de notificar
    checkRealConnectivity().then((ok) => this.notify(ok));
  };

  private handleBrowserOffline = () => {
    this.notify(false);
  };

  private startPeriodicPing() {
    // A cada 30s, verificar conectividade real (pega casos de "rede presente mas sem internet")
    this.pingInterval = setInterval(async () => {
      const ok = await checkRealConnectivity();
      this.notify(ok);
    }, 30_000);
  }

  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleBrowserOnline);
      window.removeEventListener("offline", this.handleBrowserOffline);
    }
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}

let _monitor: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!_monitor) {
    _monitor = new NetworkMonitor();
  }
  return _monitor;
}
