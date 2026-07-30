import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.voltouapp.com"),
  title: {
    default: "Vendedor WhatsApp para loja física | Voltou.",
    template: "%s | Voltou.",
  },
  description:
    "Recupere quem já comprou ou quis comprar — e venda mais no WhatsApp com cupom, oferta e upsell. Só comissão em venda recuperada.",
  keywords: [
    "vendedor whatsapp loja física",
    "recuperar vendas whatsapp",
    "upsell whatsapp loja",
    "cupom personalizado whatsapp",
    "recompra e upsell loja de bairro",
    "comissão venda recuperada",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.voltouapp.com",
    siteName: "Voltou.",
    title: "Vendedor WhatsApp para loja física | Voltou.",
    description:
      "Recupere quem já comprou ou quis comprar — e venda mais. Só comissão quando o dinheiro entra.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendedor WhatsApp para loja física | Voltou.",
    description:
      "Recupere quem já comprou ou quis comprar — e venda mais. Só comissão quando o dinheiro entra.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7faf7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Voltou.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.voltouapp.com",
    description:
      "Recupere quem já comprou ou quis comprar — e venda mais no WhatsApp com cupom, oferta e upsell. Só comissão em venda recuperada.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "Conta grátis para começar",
    },
    inLanguage: "pt-BR",
  };

  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${jakarta.variable} min-h-full w-full overflow-x-clip antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
