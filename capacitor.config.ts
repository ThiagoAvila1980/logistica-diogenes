import type { CapacitorConfig } from "@capacitor/cli";
import { config as loadEnv } from "dotenv";

// Carrega .env.local para não depender de $env no PowerShell a cada sync.
loadEnv({ path: ".env.local" });
loadEnv();

/**
 * Shell nativo Android que carrega o app Next.js.
 * Defina CAPACITOR_SERVER_URL no .env.local (ex.: http://192.168.15.165:3000).
 * Se o IP do PC mudar, atualize o .env.local e rode `npm run cap:sync`.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "br.com.vidracariadiogenes.logistica",
  appName: "Logística Diógenes",
  webDir: "capacitor-www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
  plugins: {},
  android: {
    allowMixedContent: true,
  },
};

export default config;
