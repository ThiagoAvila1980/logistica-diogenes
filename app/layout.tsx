import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UrlMaskProvider } from "@/components/navigation/url-mask-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono só em trechos pontuais (nº OS, etc.); evita preload não usado na login/home.
  preload: false,
});

export const metadata: Metadata = {
  title: "Logística Diógenes",
  description: "Gestão de vidraçaria — medição ao pós-venda",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Medições",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logo 01.png",
    apple: "/logo 01.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <UrlMaskProvider>{children}</UrlMaskProvider>
      </body>
    </html>
  );
}
