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
    default: "Recupere as vendas que a loja perde todo dia | Voltou",
    template: "%s | Voltou",
  },
  description:
    "A Voltou recupera clientes que compraram só uma vez: a IA escolhe o produto, personaliza o cupom e fecha no WhatsApp da loja. Sem mensalidade — só comissão.",
  keywords: [
    "recuperar vendas loja física",
    "recompra whatsapp loja",
    "cupom personalizado whatsapp",
    "upsell loja de bairro",
    "comissão venda recuperada",
    "whatsapp da loja",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.voltouapp.com",
    siteName: "Voltou",
    title: "Recupere as vendas que a loja perde todo dia | Voltou",
    description:
      "IA que recupera a segunda venda no WhatsApp da loja. Sem mensalidade — só comissão.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recupere as vendas que a loja perde todo dia | Voltou",
    description:
      "IA que recupera a segunda venda no WhatsApp da loja. Sem mensalidade — só comissão.",
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
    name: "Voltou",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.voltouapp.com",
    description:
      "A Voltou recupera clientes que compraram só uma vez: a IA escolhe o produto, personaliza o cupom e fecha no WhatsApp da loja. Sem mensalidade — só comissão.",
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
