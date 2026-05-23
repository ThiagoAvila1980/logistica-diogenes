import type { NextConfig } from "next";

function remoteImagePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/**",
    },
  ];

  for (const envUrl of [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.R2_PUBLIC_URL,
  ]) {
    const raw = envUrl?.trim();
    if (!raw) continue;
    try {
      const { hostname, protocol } = new URL(raw);
      patterns.push({
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        pathname: "/**",
      });
    } catch {
      // URL inválida — ignorar
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImagePatterns(),
  },
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