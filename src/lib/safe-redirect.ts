/**
 * Allowed hosts for payment / OAuth redirects (open-redirect hardening).
 */
const ALLOWED_REDIRECT_HOST_SUFFIXES = [
  'mercadopago.com',
  'mercadopago.com.br',
  'mercadolibre.com',
  'mercadolibre.com.br',
  'bling.com.br',
  'www.bling.com.br',
] as const;

export function isAllowedExternalRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_REDIRECT_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function safeExternalRedirect(url: string): void {
  if (!isAllowedExternalRedirect(url)) {
    throw new Error('URL de redirecionamento não permitida.');
  }
  window.location.href = url;
}
