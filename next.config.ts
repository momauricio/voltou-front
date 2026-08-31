import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/content-security-policy";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/painel/campanhas",
        destination: "/painel",
        permanent: false,
      },
      {
        source: "/painel/campanhas/:path*",
        destination: "/painel",
        permanent: false,
      },
      {
        source: "/painel/whatsapp",
        destination: "/painel/perfil#whatsapp",
        permanent: false,
      },
      {
        source: "/painel/whatsapp/:path*",
        destination: "/painel/perfil#whatsapp",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    if (!target) return [];
    return [
      {
        source: "/backend/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
