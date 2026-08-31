export const MP_BRICK_LOAD_ERROR =
  'Não foi possível carregar Pix e cartão. Recarregue a página. Se o erro continuar, o checkout está bloqueado neste navegador.';

export const MP_BRICK_LOAD_TIMEOUT_MS = 12_000;

export function isMercadoPagoResource(uri: string): boolean {
  return /mercadopago|mercadolibre|mlstatic/i.test(uri);
}
