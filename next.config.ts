import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

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

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: remoteImagePatterns(),
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "qrcode",
  ],
  transpilePackages: [
    "@capacitor/core",
    "@kduma-autoid/capacitor-bluetooth-printer",
  ],
  outputFileTracingIncludes: {
    "/field": ["./node_modules/pdf-parse/dist/worker/**/*"],
    "/field/[osId]": ["./node_modules/pdf-parse/dist/worker/**/*"],
    "/api/labels/[osId]": ["./assets/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  turbopack: {},
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

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);