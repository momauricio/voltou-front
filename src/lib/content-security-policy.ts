/**
 * CSP for Next.js `headers()`. Keep default-src strict; only Mercado Pago
 * Payment Brick origins are added (sdk.mercadopago.com + mlstatic scripts,
 * mercadopago/mercadolibre/mlstatic frames).
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mlstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: http://localhost:3001 http://127.0.0.1:3001",
    "frame-src https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
