import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/field": ["./node_modules/pdf-parse/dist/worker/**/*"],
    "/field/[osId]": ["./node_modules/pdf-parse/dist/worker/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows: evita rebuild parcial que deixa chunks órfãos no .next
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;