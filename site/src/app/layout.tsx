import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diogenesenvidracamentos.com.br"),
  title: "Diogenes Envidraçamentos Especiais | Campo Grande - MS",
  description:
    "A sofisticação dos envidraçamentos a seu alcance. Sacadas de vidro, box de banheiro, espelhos e envidraçamentos especiais em Campo Grande - MS.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "envidraçamentos",
    "sacada de vidro",
    "box banheiro",
    "espelhos",
    "vidraçaria Campo Grande",
    "Diogenes Envidraçamentos",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://diogenesenvidracamentos.com.br",
    siteName: "Diogenes Envidraçamentos Especiais",
    title: "Diogenes Envidraçamentos Especiais",
    description: "A sofisticação dos envidraçamentos a seu alcance.",
    // opengraph-image.tsx gera a OG image automaticamente em PNG 1200×630
  },
  twitter: {
    card: "summary_large_image",
    title: "Diogenes Envidraçamentos Especiais",
    description: "A sofisticação dos envidraçamentos a seu alcance.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Diogenes Envidraçamentos Especiais",
  description:
    "A sofisticação dos envidraçamentos a seu alcance. Sacadas de vidro, box de banheiro, espelhos e envidraçamentos especiais em Campo Grande - MS.",
  url: "https://diogenesenvidracamentos.com.br",
  telephone: "+5567999995943",
  email: "diogenesenvidracamentos@gmail.com",
  image: "https://diogenesenvidracamentos.com.br/images/sacada-hd.webp",
  priceRange: "$$",
  areaServed: {
    "@type": "City",
    name: "Campo Grande",
    addressRegion: "MS",
    addressCountry: "BR",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Júlia Maksude, 471",
    addressLocality: "Campo Grande",
    addressRegion: "MS",
    postalCode: "79011-100",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -20.4697,
    longitude: -54.6201,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "08:00",
      closes: "12:00",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
