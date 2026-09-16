/**
 * CSP for Next.js `headers()`. Keep default-src strict; Mercado Pago
 * Payment Brick origins, Google Identity Services (GIS) for lojista
 * “Continuar com Google”, Google Tag Manager (GTM-W93ND43T), and PostHog.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mlstatic.com https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: http://localhost:3001 http://127.0.0.1:3001",
    "frame-src https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com https://accounts.google.com https://www.googletagmanager.com https://*.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
