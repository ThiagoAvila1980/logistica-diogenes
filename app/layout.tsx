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
  title: "Fluxo Diógenes",
  description: "Gestão de vidraçaria — medição ao pós-venda",
  icons: {
    icon: "/favicon.svg",
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
